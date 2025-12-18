"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Mail, 
  MessageSquare, 
  HelpCircle,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react"
import { getClientSession, getCurrentPlanFeatures } from "@/lib/auth"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [planFeatures, setPlanFeatures] = useState<any>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resourceModal, setResourceModal] = useState<null | "docs" | "faqs" | "videos">(null)

  useEffect(() => {
    const sess = getClientSession()
    setSession(sess)
    setPlanFeatures(getCurrentPlanFeatures())
    
    if (sess?.userName) setName(sess.userName)
    if (sess?.userEmail) setEmail(sess.userEmail)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !subject || !message) {
      toast.error("Please fill in all fields")
      return
    }

    setIsSubmitting(true)

    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500))

    // In production, this would send to your support system
    console.log("Support Request:", { name, email, subject, message, plan: planFeatures?.displayName })

    setSubmitted(true)
    setIsSubmitting(false)
    toast.success("Support request submitted successfully!")
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubject("")
      setMessage("")
      setSubmitted(false)
    }, 3000)
  }

  const isProfessionalOrHigher = planFeatures && 
    (planFeatures.displayName === "Professional" || 
     planFeatures.displayName === "Enterprise Gold" || 
     planFeatures.displayName === "Premium Plus")

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-1">Get help with CertiStage</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Support Contact Info + Resource buttons */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Quick Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a 
                    href="mailto:support@certistage.com" 
                    className="text-xs text-primary hover:underline"
                  >
                    support@certistage.com
                  </a>
                </div>
              </div>

              {isProfessionalOrHigher && (
                <div className="pt-2 border-t">
                  <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {planFeatures.displayName} Support
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Response within 24 hours
                  </p>
                </div>
              )}

              {!isProfessionalOrHigher && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Upgrade to Professional or higher for priority support and faster response times.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => window.location.href = "/client/upgrade"}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm" 
                size="sm"
                onClick={() => setResourceModal("docs")}
              >
                Documentation
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm" 
                size="sm"
                onClick={() => setResourceModal("faqs")}
              >
                FAQs
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm" 
                size="sm"
                onClick={() => setResourceModal("videos")}
              >
                Video Tutorials
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Request Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Submit Support Request
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
                <p className="text-muted-foreground mb-1">
                  We've received your support request
                </p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  {isProfessionalOrHigher ? "Response within 24 hours" : "Response within 48 hours"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {isProfessionalOrHigher 
                      ? "Priority support - 24 hour response" 
                      : "Standard support - 48 hour response"}
                  </p>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Submitting...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Certificate not generating?</h4>
              <p className="text-sm text-muted-foreground">
                Make sure your template image is properly uploaded and all required fields are filled in.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Can't upload recipients?</h4>
              <p className="text-sm text-muted-foreground">
                Check that your Excel file has the correct column headers: Name, Email, Mobile.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Download link not working?</h4>
              <p className="text-sm text-muted-foreground">
                Ensure the certificate has been generated first. Check your plan's download limits.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Need more features?</h4>
              <p className="text-sm text-muted-foreground">
                Upgrade your plan to unlock advanced features like bulk import and analytics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!resourceModal} onOpenChange={() => setResourceModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {resourceModal === "docs" && "Documentation"}
              {resourceModal === "faqs" && "FAQs"}
              {resourceModal === "videos" && "Video Tutorials"}
            </DialogTitle>
            <DialogDescription>
              {resourceModal === "docs" && "Quick steps to use CertiStage."}
              {resourceModal === "faqs" && "Most asked questions and quick answers."}
              {resourceModal === "videos" && "Watch short how-to clips."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {resourceModal === "docs" && (
              <ul className="list-disc list-inside space-y-1">
                <li>Create event and certificate type, then design the template.</li>
                <li>Import recipients (Excel: Name, Email, Mobile, Registration No).</li>
                <li>Generate certificates and share download links.</li>
                <li>Export reports for downloaded vs pending recipients.</li>
              </ul>
            )}
            {resourceModal === "faqs" && (
              <div className="space-y-2">
                <p><span className="font-medium text-foreground">Import steps:</span> Recipients → choose type → Import Excel with required columns.</p>
                <p><span className="font-medium text-foreground">Downloads blocked:</span> Generate certificates and check plan limits.</p>
                <p><span className="font-medium text-foreground">Edit after sending:</span> Update template, regenerate, resend links.</p>
                <p><span className="font-medium text-foreground">Paid plans:</span> More events, bulk import, unlimited downloads/exports, priority support.</p>
              </div>
            )}
            {resourceModal === "videos" && (
              <div className="space-y-2">
                <p>Short clips coming soon. Need a walkthrough? Email support@certistage.com.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
