"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarClock, CreditCard, Settings, PanelLeftClose, PanelLeft } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import styles from "./Sidebar.module.css";

const navItems = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/patients", label: "Patients", icon: Users },
	{ href: "/visits", label: "Visits", icon: CalendarClock },
	{ href: "/payments", label: "Payments", icon: CreditCard },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
	const pathname = usePathname();
	const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
	const [isNarrow, setIsNarrow] = useState(false);
	const [formattedDate, setFormattedDate] = useState("");

	useEffect(() => {
		// A 260px sidebar leaves too little room for page content on small
		// viewports, which pushed the main column off-screen. Below this width
		// the sidebar is always the icon rail, regardless of the manual toggle.
		const query = window.matchMedia("(max-width: 900px)");
		const sync = (matches: boolean) => setIsNarrow(matches);

		sync(query.matches);
		const onChange = (event: MediaQueryListEvent) => sync(event.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		// Format the date on the client only to avoid server/client mismatch.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setFormattedDate(
			new Date().toLocaleDateString("en-US", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
		);
	}, []);

	const collapsed = manuallyCollapsed || isNarrow;

	return (
		<aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
			<div className={styles.brand}>
				<button
					type="button"
					className={styles.logoButton}
					aria-label={collapsed ? "Expand menu" : "Dentora"}
					onClick={() => {
						if (collapsed) {
							setManuallyCollapsed(false);
						}
					}}
					disabled={!collapsed}
				>
					<span className={styles.logoMark} aria-hidden="true" />
				</button>
				{!collapsed ? (
					<div className={styles.brandText}>
						<div className={styles.brandName}>Dentora</div>
						{/* <div className={styles.brandSubtitle}>Smile Clinic</div> */}
					</div>
				) : null}
				<button
					type="button"
					className={styles.collapseButton}
					aria-label="Toggle menu"
					aria-pressed={manuallyCollapsed}
					disabled={isNarrow}
					onClick={() => setManuallyCollapsed((prev) => !prev)}
				>
					{collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
				</button>
			</div>

			<nav className={styles.nav}>
				{navItems.map(({ href, label, icon: Icon }) => {
					const isActive =
						href === "/" ? pathname === "/" : pathname.startsWith(href);
					return (
						<Link
							key={href}
							href={href}
							className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
							title={collapsed ? label : undefined}
						>
							<Icon size={18} strokeWidth={2} />
							{!collapsed ? <span>{label}</span> : null}
						</Link>
					);
				})}
			</nav>

			<div className={styles.footer}>
				{!collapsed ? <span className={styles.date}>{formattedDate}</span> : null}
				<ProfileMenu collapsed={collapsed} />
			</div>
		</aside>
	);
}
