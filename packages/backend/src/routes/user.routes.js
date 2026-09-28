"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/user.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
// All user routes require authentication
router.get('/', auth_middleware_1.authenticate, controller.getAllUsers.bind(controller));
router.post('/', auth_middleware_1.authenticate, controller.createUser.bind(controller));
router.put('/:id', auth_middleware_1.authenticate, controller.updateUser.bind(controller));
router.delete('/:id', auth_middleware_1.authenticate, controller.deleteUser.bind(controller));
exports.default = router;
//# sourceMappingURL=user.routes.js.map