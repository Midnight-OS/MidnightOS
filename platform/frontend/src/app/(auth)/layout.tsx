export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="gradient-orb w-96 h-96 bg-gradient-to-br from-cyan-400 to-blue-500 top-20 -left-48" />
        <div className="gradient-orb w-[40rem] h-[40rem] bg-gradient-to-br from-purple-400 to-pink-500 -bottom-32 right-20" />
      </div>
      
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}