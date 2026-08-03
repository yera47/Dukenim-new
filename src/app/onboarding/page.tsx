import{requireRole}from"@/lib/auth";import{OnboardingFlow}from"./onboarding-flow";export default async function Onboarding(){await requireRole(["owner","superadmin"]);return <OnboardingFlow/>}
