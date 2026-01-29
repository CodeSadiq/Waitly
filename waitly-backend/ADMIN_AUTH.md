# Admin Authentication

## Overview
Admin accounts **cannot** be created through the public registration form. Admin credentials are securely stored in environment variables and must be created in the database manually.

## Setup

### 1. Configure Environment Variables
Set admin credentials in your `.env` file:
```env
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

### 2. Create Admin User in Database
Run the setup script to create the admin user:
```bash
npm run create-admin
```

This script will:
- Create a new admin user if one doesn't exist
- Update the password if the admin already exists
- Use credentials from your `.env` file

### 3. Login as Admin
Use the regular login page with your admin credentials configured in the `.env` file.

**Default Admin Credentials (CHANGE IN PRODUCTION):**
- Email: `admin@waitly.com`
- Password: `Admin@Waitly2026`

## Resetting Admin Password

If you forget the admin password or need to change it:

1. Update `ADMIN_PASSWORD` in `.env`
2. Run: `npm run create-admin`
3. The script will update the existing admin's password

## Security Notes

- ⚠️ **IMPORTANT**: Change the default admin password in production
- Admin role is blocked from public registration
- Admin credentials are only in `.env` (never committed to Git)
- `.env` file is in `.gitignore` to prevent accidental commits
- Always use strong passwords for admin accounts
