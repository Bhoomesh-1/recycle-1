import { useState, useEffect } from 'react';
import { useAuth, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
// Using Unicode symbols instead of lucide-react icons

interface LocalReport {
  id: string;
  user_id: string;
  title?: string;
  description: string;
  category: 'illegal_dumping' | 'hazardous_waste' | 'blocked_drainage' | 'broken_bin' | 'other';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
}

const LS_KEY = 'ecosort_reports_local';

const readLocal = (): LocalReport[] => {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const writeLocal = (list: LocalReport[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} };

export default function ReportIssue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<'illegal_dumping' | 'hazardous_waste' | 'blocked_drainage' | 'broken_bin' | 'other'>('illegal_dumping');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loc, setLoc] = useState<{lat?: number; lng?: number}>({});
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [lastCheckedReports, setLastCheckedReports] = useState<LocalReport[]>([]);

  // Load reports on component mount
  useEffect(() => {
    loadReports();
  }, []);

  // Check for status updates
  useEffect(() => {
    if (reports.length > 0 && lastCheckedReports.length > 0) {
      checkForStatusUpdates();
    }
    setLastCheckedReports(reports);
  }, [reports]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('illegal_reports')
          .select('*')
          .eq('user_id', user?.id || 'mock-user-1')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setReports(data || []);
      } else {
        const localReports = readLocal();
        setReports(localReports);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast({
        title: 'Failed to load reports',
        description: 'Could not load your report history.',
        variant: 'destructive',
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const checkForStatusUpdates = () => {
    reports.forEach((currentReport) => {
      const previousReport = lastCheckedReports.find(r => r.id === currentReport.id);
      
      if (previousReport && previousReport.status !== currentReport.status) {
        const statusMessages = {
          new: 'Your report has been received and is under review.',
          in_progress: 'Your report is being investigated by authorities.',
          resolved: 'Your report has been resolved! Thank you for helping keep the city clean.',
          rejected: 'Your report could not be processed. Please review and resubmit if needed.'
        };

        toast({
          title: 'Report Status Update',
          description: statusMessages[currentReport.status as keyof typeof statusMessages],
          duration: 5000,
        });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'default',
      in_progress: 'secondary',
      resolved: 'default',
      rejected: 'destructive'
    } as const;
    
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${colors[status as keyof typeof colors]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${colors[severity as keyof typeof colors]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGeo = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast({
          title: 'Location captured',
          description: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      (err) => {
        toast({
          title: 'Location error',
          description: 'Could not get your location. Please try again.',
          variant: 'destructive',
        });
      }
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!desc.trim()) {
      setError('Please provide a description of the issue.');
      return;
    }
    
    if (!photo) {
      setError('Please attach a photo of the issue.');
      return;
    }
    
    setSubmitting(true);
    const uid = user?.id || 'mock-user-1';
    let photoUrl: string | undefined;

    try {
      // Upload photo
      if (photo && supabase) {
        const path = `${uid}/${Date.now()}_${photo.name}`;
        const { data: up, error: upErr } = await supabase.storage.from('reports').upload(path, photo, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('reports').getPublicUrl(up.path);
        photoUrl = pub.publicUrl;
      } else if (photo) {
        photoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(photo);
        });
      }

      // Submit report
      if (supabase) {
        const { error } = await supabase.from('illegal_reports').insert({
          user_id: uid,
          title: title.trim() || null,
          description: desc.trim(),
          category,
          severity,
          photo_url: photoUrl,
          geo: loc.lat && loc.lng ? { type: 'Point', coordinates: [loc.lng, loc.lat] } : null,
          address: address.trim() || null,
          status: 'new',
        });
        if (error) throw error;
      } else {
        const list = readLocal();
        list.unshift({
          id: `local-${Date.now()}`,
          user_id: uid,
          title: title.trim() || undefined,
          description: desc.trim(),
          category,
          severity,
          photo_url: photoUrl,
          latitude: loc.lat,
          longitude: loc.lng,
          address: address.trim() || undefined,
          status: 'new',
          created_at: new Date().toISOString(),
        });
        writeLocal(list);
      }

      setDone(true);
      await loadReports(); // Reload reports after successful submission
      toast({
        title: 'Report submitted successfully',
        description: 'Thank you for helping keep the city clean. Authorities will be notified.',
      });
    } catch (err) {
      console.error('Report failed', err);
      setError('Failed to submit report. Please try again.');
      toast({
        title: 'Submission failed',
        description: 'There was an error submitting your report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="text-6xl text-green-500">✓</div>
            </div>
            <CardTitle className="text-2xl">Report Submitted Successfully!</CardTitle>
            <CardDescription className="text-lg">
              Thank you for helping keep the city clean. Authorities will be notified and will respond within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                Your report has been assigned ID: <strong>#{Date.now().toString().slice(-6)}</strong>
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                Submit Another Report
              </Button>
              <Button onClick={() => window.history.back()}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Tabs defaultValue="submit" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit" className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            Submit Report
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            My Reports ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Report Environmental Issue
              </CardTitle>
              <CardDescription>
                Help keep our city clean by reporting illegal dumping, hazardous waste, or other environmental issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <span className="text-lg mr-2">❌</span>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Brief title for the issue" 
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Issue Category</Label>
                  <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="illegal_dumping">🚛 Illegal Dumping</SelectItem>
                      <SelectItem value="hazardous_waste">⚠️ Hazardous Waste</SelectItem>
                      <SelectItem value="blocked_drainage">🌊 Blocked Drainage</SelectItem>
                      <SelectItem value="broken_bin">🗑️ Broken Bin</SelectItem>
                      <SelectItem value="other">📋 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Severity */}
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity Level</Label>
                  <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low - Minor issue</SelectItem>
                      <SelectItem value="medium">🟡 Medium - Moderate concern</SelectItem>
                      <SelectItem value="high">🟠 High - Serious issue</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent - Immediate attention needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="desc" className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    Description *
                  </Label>
                  <Textarea 
                    id="desc" 
                    value={desc} 
                    onChange={(e) => setDesc(e.target.value)} 
                    placeholder="Provide detailed description of the issue, including any relevant details..." 
                    rows={4}
                    required
                  />
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <Label htmlFor="photo" className="flex items-center gap-2">
                    <span className="text-lg">📷</span>
                    Photo Evidence *
                  </Label>
                  <Input 
                    id="photo" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)} 
                    required
                  />
                  {photo && (
                    <div className="text-sm text-green-600">
                      ✓ Photo selected: {photo.name}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    Location
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={getGeo} className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      Use Current Location
                    </Button>
                    {loc.lat && loc.lng && (
                      <span className="text-sm text-gray-500">
                        ✓ Lat {loc.lat.toFixed(4)}, Lng {loc.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <Input 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Or enter address manually" 
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting Report...' : 'Submit Report'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Report History
                  </CardTitle>
                  <CardDescription>
                    View all your submitted reports and their current status.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadReports}
                  disabled={loadingReports}
                  className="flex items-center gap-2"
                >
                  <span className={`text-lg ${loadingReports ? 'animate-spin' : ''}`}>🔄</span>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-3xl animate-spin text-gray-400">⏳</span>
                  <span className="ml-2 text-gray-500">Loading reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl text-gray-400 mx-auto mb-4">👁️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
                  <p className="text-gray-500">You haven't submitted any reports yet. Submit your first report to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {report.title || 'Untitled Report'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {formatDate(report.created_at)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(report.status)}
                            {getSeverityBadge(report.severity)}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors text-foreground">
                              {report.category.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-gray-700">{report.description}</p>
                          
                          {report.address && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="text-lg">📍</span>
                              {report.address}
                            </div>
                          )}
                          
                          {report.photo_url && (
                            <div className="mt-3">
                              <img 
                                src={report.photo_url} 
                                alt="Report photo" 
                                className="w-full max-w-xs rounded-lg border"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
