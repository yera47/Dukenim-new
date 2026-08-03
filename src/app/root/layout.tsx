import{requireRole}from"@/lib/auth";export default async function RootLayout({children}:{children:React.ReactNode}){await requireRole(["superadmin"]);return children}
