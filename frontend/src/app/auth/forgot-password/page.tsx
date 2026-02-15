'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useForgotPassword } from '@/lib/api-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false)
  const forgotPassword = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await forgotPassword.mutateAsync(data)
      setEmailSent(true)
      toast.success('Password reset instructions sent!')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email'
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-page-title text-center">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-center">
            {emailSent
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive password reset instructions'}
          </CardDescription>
        </CardHeader>

        {emailSent ? (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 dark:text-emerald-400" />
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent password reset instructions to:
                </p>
                <p className="font-medium">{getValues('email')}</p>
                <p className="text-xs text-muted-foreground mt-4">
                  If you don&apos;t see the email, check your spam folder or try again.
                </p>
              </div>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@assetapp.com"
                  {...register('email')}
                  disabled={forgotPassword.isPending}
                />
                {errors.email && (
                  <p className="text-helper text-destructive">{errors.email.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {forgotPassword.isPending ? 'Sending...' : 'Send Reset Instructions'}
              </Button>
            </CardFooter>
          </form>
        )}

        <CardFooter className="flex flex-col space-y-2 pt-0">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
