// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightIcon, UserIcon, ShieldIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

export default async function Dashboard() {
  const supabase = await createClient()
  
  // Get user using getUser() - best practice compared to getSession
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    // If there's an error or no user, redirect to sign in
    redirect('/auth/signin')
  }
  
  // Get user profile from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="py-6 md:py-10 container">
        <div className="max-w-4xl mx-auto">
          {/* Dashboard Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {profile?.full_name || user.email?.split('@')[0]}
              </p>
            </div>
            {/* Updated sign out form with button type */}
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">Sign out</Button>
            </form>
          </div>
          
          <Separator className="my-6" />
          
          {/* User Profile Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile?.full_name || user.email?.split('@')[0]}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
                  <p className="text-sm mt-1 font-mono bg-muted p-2 rounded-md overflow-auto">{user.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Last Sign In</h3>
                  <p className="text-sm mt-1">{new Date(user.last_sign_in_at || '').toLocaleString()}</p>
                </div>
                {user.app_metadata?.provider && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Auth Provider</h3>
                    <p className="text-sm mt-1 capitalize">{user.app_metadata.provider}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Action Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-primary" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Update your profile information and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Customize your profile by adding your full name, profile picture, and other personal details.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/profile/edit">
                    Edit Profile
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldIcon className="h-5 w-5 mr-2 text-primary" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage your account security and password</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Update your password, enable two-factor authentication, and review your recent login activity.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/profile/security">
                    Security Settings
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}