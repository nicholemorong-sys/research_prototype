# ISKOLAR MARSU

Responsive, multi-page scholarship application and monitoring prototype for Marinduque State University (MarSU). Built with semantic HTML, CSS, and vanilla JavaScript; no framework or package installation is required.

## Run the demo

Serve this folder from a local web server and open `index.html` or `login.html`. Serving over `http://localhost` is recommended because the app uses the Web Crypto API to hash demo passwords. For example, with Python installed:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

The official MarSU seal from the university website is bundled at `assets/marsu_logo.png`; a MarSU-colored monogram appears if the image is unavailable.

### Demo staff account

- Role: Admin / Staff
- Email: `staff@marsu.edu.ph`
- Password: `MarSUstaff26!`

Students can create accounts on the registration page. Staff registrations are held pending and must be activated by an existing administrator. The supplied staff account is for local demonstration only.

## Pages

- `login.html` — Role-selecting sign-in.
- `register.html` — Role-selecting account creation; staff access awaits activation.
- `student-dashboard.html` — Student activity summary, submitted applications, announcements, and featured programs.
- `admin-dashboard.html` — Separate staff overview, application review queue, staff activation, student directory/access management, and CSV export.
- `scholarships.html` — Searchable and filterable scholarship catalog; staff can add programs.
- `application.html` — Scholarship requirements, student application details, and document uploads.
- `profile.html` — Student profile and optional photo management.
- `tracking.html` — Student-only application status timeline and staff decision note.
- `announcements.html` — Student announcement board; staff can publish and remove notices.
- `payouts.html` — Payout schedule list; staff can publish or remove schedule entries.

`index.html` opens the sign-in page. Shared behavior is in `app.js`; visual styles and responsive rules are in `styles.css`.

## Features

- Role-aware navigation, sign-in, and registration flows.
- Student and staff dashboards with application and program statistics.
- Program listings with text search, provider filters, deadlines, award details, and requirements; staff can add and edit programs.
- Duplicate application prevention, input checks, and PDF/JPG/PNG uploads (5 MB maximum per file).
- Optional JPG/PNG student profile photo (3 MB maximum) and editable contact/profile information.
- Student-visible status timeline; only staff-facing review controls can record `Pending`, `Approved`, or `Rejected` decisions.
- Staff applicant review includes submitted documents, student details, applicant-information verification, and a student-visible decision note.
- Staff registration activation, student access management, student directory, and downloadable CSV applicant records.
- Announcement publishing and editable payout schedule management.
- Notification panel, responsive navigation menu, storage feedback, and accessible status messages.

The initial scholarships, announcements, and payout dates are sample content for demonstration. Confirm actual eligibility, deadlines, award amounts, and release dates with MarSU and each scholarship provider before relying on them.

## Accessibility

- Semantic page landmarks, headings, lists, forms, labels, and tables.
- Skip link, visible keyboard focus, native controls, and keyboard-operable actions.
- Accessible names and state attributes for menus, notification panel, review dialog, status updates, and file selection.
- Text alternatives for the university seal and profile image; decorative icons are hidden from assistive technology.
- Responsive layouts preserve readable content and scrollable data tables on narrow screens.
- Reduced-motion preferences are respected.

## Responsive design

- Desktop uses a persistent side navigation and multi-column dashboard/card layouts.
- Tablet reduces sidebar and card density while retaining comfortably sized controls.
- Mobile switches to a collapsible navigation menu, stacks dashboard panels and forms, and reduces card columns to one on small screens.
- Tables retain their column structure and scroll horizontally rather than collapsing data labels.

## Testing procedures

1. Start the local server and sign in as Admin / Staff using the demo account above.
2. In the staff dashboard, activate any pending staff account, review an application, download its uploaded document, verify applicant information, and save each supported status.
3. Add a scholarship, publish an announcement and payout schedule, then download the CSV export.
4. Sign out. Register as a student with a second email, complete the profile, and submit an application with a small PDF or image.
5. Confirm the student sees only their own application status, cannot reach the staff dashboard, and has no decision controls.
6. Sign in as staff again and verify the submitted application, uploaded file, and status decision are visible.
7. Test search and provider filters, announcement and schedule views, sign-out, and duplicate application prevention.
8. Use keyboard-only navigation (Tab, Shift+Tab, Enter, Space, Escape), check focus visibility and form error announcements, and test at approximately 375 px, 768 px, and 1280 px widths.
9. In browser developer tools, inspect the console and storage panels. Local data can be cleared by removing keys prefixed `iskolar_marsu_` from localStorage/sessionStorage and the `iskolar-marsu-files` IndexedDB database.

## Prototype security boundary

This is a browser-only prototype, not a production scholarship service. Salted, iterated demo password hashes, profile records, decisions, and schedules live in the current browser's local storage; uploaded files are held in that browser's IndexedDB. A user who can access browser developer tools can alter local data, and there is no server-side identity check, authorization, audit trail, malware scan, backup, or secure document repository. Frontend role checks demonstrate the intended experience but cannot guarantee authorization. Production use requires a trusted backend, institution-managed authentication, server-enforced role permissions, protected document storage, validation, audit logging, and approved privacy/security practices. Do not enter real student data or reuse the demo credentials in production.
