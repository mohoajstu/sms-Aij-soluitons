# Student Onboarding System

## Overview
The Student Onboarding System allows parents to register their accounts and add their students to Tarbiyah Learning Academy once their children have been accepted.

## Process Flow

### 1. Student Acceptance
- Students get accepted to the school
- Each accepted student receives a unique student code (format: SC + 6 digits)
- Parents receive an email with:
  - Their Tarbiyah ID (format: TP + 6 digits)
  - Generic password: `TarbiyahWelcome2024`
  - Student code(s) for each accepted child

### 2. Parent Verification (Step 1)
- Parents visit `/onboarding`
- Enter their Tarbiyah ID and password
- System checks if parent already exists:
  - **Existing Parent**: Proceeds to Step 3 (Add Students)
  - **New Parent**: Proceeds to Step 2 (Complete Profile)

### 3. Parent Profile Completion (Step 2)
- New parents complete their personal information:
  - Personal details (name, DOB, gender, etc.)
  - Contact information (email, phones)
  - Address information
  - Citizenship details
  - Language preferences

### 4. Student Registration (Step 3)
- Parents enter student code for each child
- Complete student information:
  - Personal details
  - Schooling information
- Students are automatically linked to the parent account
- Parents can register multiple students

## Technical Details

### ID Formats
- **Parent IDs**: TP + 6 digits (e.g., TP105624)
- **Student IDs**: TLS + 6 digits (e.g., TLS138747)
- **Student Codes**: SC + 6 digits (e.g., SC123456)

### Database Structure
- Creates documents in `parents` and `students` collections
- Maintains bidirectional relationships
- Auto-generates unique IDs
- Stores timestamps for auditing

### Security Features
- Validates parent IDs and passwords
- Checks student codes against acceptance list
- Prevents duplicate registrations
- Maintains data integrity

## Usage Instructions

### For Administrators
1. Generate parent IDs and student codes for accepted students
2. Send acceptance emails with credentials
3. Monitor onboarding progress through admin dashboard

### For Parents
1. Visit the onboarding page
2. Enter credentials from acceptance email
3. Complete profile (if first time)
4. Register each student using their unique code
5. Review and submit

## Features
- Multi-step guided process
- Progress tracking
- Form validation
- Error handling
- Mobile responsive
- Support for multiple students per parent
- Data persistence across sessions

## Future Enhancements
- Email verification
- Document upload capability
- Integration with school management system
- Automated acceptance email generation
- Parent dashboard for post-registration updates 