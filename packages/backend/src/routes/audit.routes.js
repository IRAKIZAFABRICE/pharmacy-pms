"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
router.post('/login', rateLimiter_middleware_1.authRateLimiter, controller.login.bind(controller));
router.post('/logout', auth_middleware_1.authenticate, controller.logout.bind(controller));
router.get('/me', auth_middleware_1.authenticate, controller.getCurrentUser.bind(controller));
router.post('/change-password', auth_middleware_1.authenticate, controller.changePassword.bind(controller));
router.post('/refresh-token', controller.refreshToken.bind(controller));
exports.default = router;
//# sourceMappingURL=audit.routes.js.map