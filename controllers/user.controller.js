const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { ROLES, ROLE_VALUES } = require("../config/roles");
const { recordHistory } = require("../services/history.service");
const { getDonationTotals } = require("../services/donation.service");

// @desc    Get current authenticated user
// @route   GET /api/v1/users/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const lifetime = await getDonationTotals(req.user.userId);
    const currentYear = new Date().getFullYear();
    const yearTotals = await getDonationTotals(req.user.userId, currentYear);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        donations: {
          zakat: lifetime.zakat,
          sadaqah: lifetime.sadaqah,
          total: lifetime.total,
          year: currentYear,
          yearZakat: yearTotals.zakat,
          yearSadaqah: yearTotals.sadaqah,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all users (admin only)
// @route   GET /api/v1/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user's role (admin only)
// @route   PATCH /api/v1/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    console.log("Requested role change to:", role);
    if (!ROLE_VALUES.includes(role)) {
      throw new ApiError(400, `Invalid role. Must be one of: ${ROLE_VALUES.join(", ")}`, "VALIDATION_ERROR");
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    }

    const oldRole = targetUser.role;

    if (targetUser.role === role) {
      return res.status(200).json({
        success: true,
        data: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          status: targetUser.status,
          isVerified: targetUser.isVerified,
        },
      });
    }

    if (targetUser.role === ROLES.ADMIN) {
      if (req.user.userId?.toString() === targetUser._id.toString()) {
        throw new ApiError(400, "Admins cannot change their own role", "ROLE_CHANGE_DENIED");
      }

      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) {
        throw new ApiError(400, "Cannot remove the last admin", "LAST_ADMIN");
      }
    }

    targetUser.role = role;
    await targetUser.save();

    await recordHistory({
      user: req.user,
      action: "ROLE_CHANGE",
      targetModel: "User",
      targetId: targetUser._id,
      targetName: targetUser.name,
      description: `Changed ${targetUser.name}'s role from ${oldRole} to ${role}`,
      before: { role: oldRole },
      after: { role: targetUser.role },
    });

    res.status(200).json({
      success: true,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
        isVerified: targetUser.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  getUsers,
  updateUserRole,
};
