'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download } from 'lucide-react'

export default function ReportsPage() {
  const reports = [
    {
      name: 'Assets Report',
      description: 'Complete list of all assets with details',
      endpoint: '/reports/assets',
    },
    {
      name: 'Assignments Report',
      description: 'Asset assignment history and current assignments',
      endpoint: '/reports/assignments',
    },
    {
      name: 'Transfers Report',
      description: 'Transfer requests and approval history',
      endpoint: '/reports/transfers',
    },
    {
      name: 'Users Report',
      description: 'User list with roles and departments',
      endpoint: '/reports/users',
    },
    {
      name: 'Audit Logs Report',
      description: 'System activity and change logs',
      endpoint: '/reports/audit-logs',
    },
  ]

  const handleDownload = (endpoint: string, format: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'
    window.open(`${apiUrl}${endpoint}?format=${format}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download reports in various formats
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>{report.name}</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {report.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(report.endpoint, 'csv')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(report.endpoint, 'xlsx')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  XLSX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(report.endpoint, 'pdf')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Available Formats:</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>CSV:</strong> Comma-separated values for Excel and data analysis</li>
              <li><strong>XLSX:</strong> Excel format with styled headers and auto-fit columns</li>
              <li><strong>PDF:</strong> Professional PDF documents for printing</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Date range filtering (add query params: dateFrom, dateTo)</li>
              <li>Real-time data from live database</li>
              <li>Automatic file downloads</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
