import React from 'react'
const ParentDashboard = React.lazy(() => import('./views/dashboard/ParentDashboard'))

const DashboardSwitch = React.lazy(() => import('./views/dashboard/DashboardSwitch'))
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Colors = React.lazy(() => import('./views/theme/colors/Colors'))
const Typography = React.lazy(() => import('./views/theme/typography/Typography'))

// Calendar
const CalendarDemo = React.lazy(() => import('./views/CalendarDemo'))

// Attendance
const AttendanceTabs = React.lazy(() => import('./views/attendance/attendanceTabs'))
const AttendanceTable = React.lazy(() => import('./views/attendance/attendanceTable'))
const ParentAttendance = React.lazy(() => import('./views/parent/ParentAttendance'))
//Report Cards
const ReportCard = React.lazy(() => import('./views/ReportCard/utils.js'))
const ReportCardTabs = React.lazy(() => import('./views/ReportCard/ReportCardTabs'))
const ParentReportCards = React.lazy(() => import('./views/parent/ParentReportCards'))
// Courses
const Courses = React.lazy(() => import('./views/Courses/courses'))
const CourseDetailPage = React.lazy(() => import('./views/Courses/courseDetails'))
const CourseForm = React.lazy(() => import('./views/Courses/CourseForm'))
const Timetable = React.lazy(() => import('./views/Courses/Timetable'))
//const SchedulePage = React.lazy(() => import('./views/Courses/SchedulePage'))
const AssignmentsPage = React.lazy(() => import('./views/Courses/AssignmentsPage'))
const BudgetPage = React.lazy(() => import('./views/Courses/BudgetPage'))
const TimetablePage = React.lazy(() => import('./views/Courses/TimetablePage'))
const AllAssignments = React.lazy(() => import('./views/Courses/AllAssignments'))
const ScheduleMainPage = React.lazy(() => import('./views/Schedule/ScheduleMainPage.js'))
//Registration
const RegistrationPage = React.lazy(() => import('./views/registration/registrationPage'))
const ThankYouPage = React.lazy(() => import('./views/registration/thankYouPage.js'))
const RegistrationProcessingDashboard = React.lazy(() =>
  import('./views/registration/RegistrationProcessingDashboard.js'),
)
// Base
const Accordion = React.lazy(() => import('./views/base/accordion/Accordion'))
const Breadcrumbs = React.lazy(() => import('./views/base/breadcrumbs/Breadcrumbs'))
const Cards = React.lazy(() => import('./views/base/cards/Cards'))
const Carousels = React.lazy(() => import('./views/base/carousels/Carousels'))
const Collapses = React.lazy(() => import('./views/base/collapses/Collapses'))
const ListGroups = React.lazy(() => import('./views/base/list-groups/ListGroups'))
const Navs = React.lazy(() => import('./views/base/navs/Navs'))
const Paginations = React.lazy(() => import('./views/base/paginations/Paginations'))
const Placeholders = React.lazy(() => import('./views/base/placeholders/Placeholders'))
const Popovers = React.lazy(() => import('./views/base/popovers/Popovers'))
const Progress = React.lazy(() => import('./views/base/progress/Progress'))
const Spinners = React.lazy(() => import('./views/base/spinners/Spinners'))
const Tables = React.lazy(() => import('./views/base/tables/Tables'))
const Tabs = React.lazy(() => import('./views/base/tabs/Tabs'))
// Buttons
const Buttons = React.lazy(() => import('./views/buttons/buttons/Buttons'))
const ButtonGroups = React.lazy(() => import('./views/buttons/button-groups/ButtonGroups'))
const Dropdowns = React.lazy(() => import('./views/buttons/dropdowns/Dropdowns'))
// Forms
const ChecksRadios = React.lazy(() => import('./views/forms/checks-radios/ChecksRadios'))
const FloatingLabels = React.lazy(() => import('./views/forms/floating-labels/FloatingLabels'))
const FormControl = React.lazy(() => import('./views/forms/form-control/FormControl'))
const InputGroup = React.lazy(() => import('./views/forms/input-group/InputGroup'))
const Layout = React.lazy(() => import('./views/forms/layout/Layout'))
const Range = React.lazy(() => import('./views/forms/range/Range'))
const Select = React.lazy(() => import('./views/forms/select/Select'))
const Validation = React.lazy(() => import('./views/forms/validation/Validation'))
// Icons
const CoreUIIcons = React.lazy(() => import('./views/icons/coreui-icons/CoreUIIcons'))
const Brands = React.lazy(() => import('./views/icons/brands/Brands'))
const Flags = React.lazy(() => import('./views/icons/flags/Flags'))
// Notifications
const Alerts = React.lazy(() => import('./views/notifications/alerts/Alerts'))
const Badges = React.lazy(() => import('./views/notifications/badges/Badges'))
const Modals = React.lazy(() => import('./views/notifications/modals/Modals'))
const Toasts = React.lazy(() => import('./views/notifications/toasts/Toasts'))
// Widgets
const Widgets = React.lazy(() => import('./views/widgets/Widgets'))
// Pages
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

const PeoplePage = React.lazy(() => import('./views/pages/people/PeoplePage'))
// Report Card templates (one component per PDF)
const KindergartenInitialPage = React.lazy(() => import('./views/ReportCard/ReportCards/KindergartenInitialPage.js'))
const KindergartenReportCardPage = React.lazy(() => import('./views/ReportCard/ReportCards/KindergartenReportCardPage.js'))
const Grades1to6ProgressPage = React.lazy(() => import('./views/ReportCard/ReportCards/Grades1to6ProgressPage.js'))
const Grades1to6ReportCardPage = React.lazy(() => import('./views/ReportCard/ReportCards/Grades1to6ReportCardPage.js'))
const Grades7to8ProgressPage = React.lazy(() => import('./views/ReportCard/ReportCards/Grades7to8ProgressPage.js'))
const Grades7to8ReportCardPage = React.lazy(() => import('./views/ReportCard/ReportCards/Grades7to8ReportCardPage.js'))

// Announcements
const NewAnnouncement = React.lazy(() => import('./views/Announcements/NewAnnouncement'))
const AllAnnouncements = React.lazy(() => import('./views/Announcements/AllAnnouncements'))

// Profile
const ProfilePage = React.lazy(() => import('./views/pages/profile/ProfilePage'))
const OnboardingPage = React.lazy(() => import('./views/pages/onboarding/OnboardingPage'))
// Admin SMS Settings
const SmsSettings = React.lazy(() => import('./views/admin/SmsSettings'))
// Removed duplicate Page404 and Page500 declarations
// const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
// const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
// const PrivacyPolicy = React.lazy(() => import('./views/pages/privacyPolicy/PrivacyPolicy'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: DashboardSwitch },
  {
    path: '/onboarding',
    name: 'Student Onboarding',
    element: OnboardingPage,
  },
  // Onboarding Admin removed

  { path: '/attendance', name: 'Attendance', element: AttendanceTabs, hideFor: ['parent'] },
  { path: '/attendance/parent', name: 'Parent Attendance', element: ParentAttendance },
  { path: '/reportcards', name: 'Report Cards', element: ReportCardTabs, hideFor: ['parent'] },
  { path: '/reportcards/parent', name: 'Parent Report Cards', element: ParentReportCards },
  // registration and thankYouPage are public-only routes, defined in App.js
  {
    path: '/registration/processing',
    name: 'Registration Processing',
    element: RegistrationProcessingDashboard,
  },
  { path: '/courses', name: 'Courses', element: Courses },
  { path: '/courses/new', name: 'Create Course', element: CourseForm },
  { path: '/courses/edit/:id', name: 'Edit Course', element: CourseForm },
  { path: '/courses/timetable', name: 'Timetable', element: Timetable },
  { path: '/calendar', name: 'Enhanced Calendar', element: CalendarDemo, hideFor: ['parent'] },
  //{ path: '/courses/:id/schedule', name: 'Course Schedule', element: SchedulePage },
  { path: '/courses/:id/assignments', name: 'Course Assignments', element: AssignmentsPage },
  { path: '/courses/:id/budget', name: 'Course Budget', element: BudgetPage },
  { path: '/courses/:id/timetable', name: 'Course Timetable', element: TimetablePage },
  { path: '/courses/:id', name: 'Course Detail', element: CourseDetailPage },
  { path: '/attendance/attendance-table-page', name: 'Attendance Table', element: AttendanceTable },
  { path: '/announcements/new', name: 'New Announcement', element: NewAnnouncement },
  { path: '/announcements', name: 'All Announcements', element: AllAnnouncements },
  { path: '/profile', name: 'Profile', element: ProfilePage },
  { path: '/people', name: 'People Management', element: PeoplePage },
  { path: '/schedule', name: 'Schedule', element: ScheduleMainPage },
  { path: '/admin/sms-settings', name: 'SMS Settings', element: SmsSettings, hideFor: ['parent', 'student', 'teacher', 'faculty'] },

  // Template-specific report-card routes
  { path: '/reportcards/kg-initial', name: 'KG Initial Observations', element: KindergartenInitialPage },
  { path: '/reportcards/kg-report', name: 'KG Report Card', element: KindergartenReportCardPage },
  { path: '/reportcards/1-6-progress', name: 'Gr 1-6 Progress', element: Grades1to6ProgressPage },
  { path: '/reportcards/1-6-report', name: 'Gr 1-6 Report Card', element: Grades1to6ReportCardPage },
  { path: '/reportcards/7-8-progress', name: 'Gr 7-8 Progress', element: Grades7to8ProgressPage },
  { path: '/reportcards/7-8-report', name: 'Gr 7-8 Report Card', element: Grades7to8ReportCardPage },

  // { path: '/theme', name: 'Theme', element: Colors, exact: true },
  // { path: '/theme/colors', name: 'Colors', element: Colors },
  // { path: '/theme/typography', name: 'Typography', element: Typography },
  // { path: '/base', name: 'Base', element: Cards, exact: true },
  // { path: '/base/accordion', name: 'Accordion', element: Accordion },
  // { path: '/base/breadcrumbs', name: 'Breadcrumbs', element: Breadcrumbs },
  // { path: '/base/cards', name: 'Cards', element: Cards },
  // { path: '/base/carousels', name: 'Carousel', element: Carousels },
  // { path: '/base/collapses', name: 'Collapse', element: Collapses },
  // { path: '/base/list-groups', name: 'List Groups', element: ListGroups },
  // { path: '/base/navs', name: 'Navs', element: Navs },
  // { path: '/base/paginations', name: 'Paginations', element: Paginations },
  // { path: '/base/placeholders', name: 'Placeholders', element: Placeholders },
  // { path: '/base/popovers', name: 'Popovers', element: Popovers },
  // { path: '/base/progress', name: 'Progress', element: Progress },
  // { path: '/base/spinners', name: 'Spinners', element: Spinners },
  // { path: '/base/tabs', name: 'Tabs', element: Tabs },
  // { path: '/buttons', name: 'Buttons', element: Buttons, exact: true },
  // { path: '/buttons/buttons', name: 'Buttons', element: Buttons },
  // { path: '/buttons/dropdowns', name: 'Dropdowns', element: Dropdowns },
]

export default routes
