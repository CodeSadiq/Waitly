import express from "express";
import {
  userLogin,
  userRegister,
  adminLogin,
  staffLogin,
  logout,
  getMe
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =====================================================
   REGISTER
===================================================== */

router.post("/user/register", userRegister);

/* =====================================================
   LOGIN
===================================================== */

router.post("/user/login", userLogin);
router.post("/staff/login", staffLogin);
router.post("/admin/login", adminLogin);

/* =====================================================
   CURRENT USER
===================================================== */
// router.get("/me", (req, res) => {
//   res.json({ msg: "ME HIT", cookies: req.cookies });
// });


/* =====================================================
   LOGOUT
===================================================== */

router.post("/logout", logout);

export default router;
