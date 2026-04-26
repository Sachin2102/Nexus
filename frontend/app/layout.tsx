import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import AskNexus from '@/components/AskNexus'
import CommandBar from '@/components/CommandBar'
import LoadingScreen from '@/components/LoadingScreen'

export const metadata: Metadata = {
  title: 'NEXUS — AI Chief of Staff',
  description: 'Autonomous Organizational Intelligence Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-[#0f0f1a]">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
        {/* Global interactive components */}
        <AskNexus />
