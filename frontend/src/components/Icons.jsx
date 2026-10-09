/* eslint-disable react-refresh/only-export-components -- icons are built by a factory; this only affects fast-refresh for this file */
// Shared inline icons. Each component used to define its own CheckIcon / InfoIcon / ReportIcon...
const make = (children) =>
  function Icon({ className = "h-5 w-5", strokeWidth = 2.5 }) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    );
  };

export const WarningIcon = make(
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);
export const InfoIcon = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8h.01" />
    <path d="M11 12h1v4h1" />
  </>
);
export const ShieldIcon = make(
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </>
);
export const CheckIcon = make(<path d="m20 6-11 11-5-5" />);
export const XIcon = make(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);
export const AlertIcon = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v5" />
    <path d="M12 16h.01" />
  </>
);
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />);
export const ChevronLeftIcon = make(<path d="m15 18-6-6 6-6" />);
export const ArrowLeftIcon = make(
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>
);
export const ArrowRightIcon = make(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>
);
export const ReportIcon = make(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
  </>
);
export const UploadIcon = make(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </>
);
export const PrintIcon = make(
  <>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
  </>
);
export const DatabaseIcon = make(
  <>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </>
);
export const CheckCircleIcon = make(
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m22 4-10 10.01-3-3" />
  </>
);
export const TargetIcon = CheckCircleIcon;
export const XCircleIcon = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </>
);
export const GroupIcon = make(
  <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);
export const DashboardIcon = make(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </>
);
export const SparkIcon = make(<path d="M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />);
export const ToolIcon = make(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
);
export const LightningIcon = make(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);
export const ResetIcon = make(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v6h6" />
  </>
);

export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle opacity={0.25} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path opacity={0.85} fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4z" />
    </svg>
  );
}
