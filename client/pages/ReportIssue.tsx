import React, { useState } from 'react';
import { useAuth, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LocalReport {
  id: string;
  user_id: string;
  description: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
}

const LS_KEY = 'ecosort_reports_local';

const readLocal = (): LocalReport[] => {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const writeLocal = (list: LocalReport[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} };

export default function ReportIssue() {
  const { user } = useAuth();
  const [photo, setPhoto] = useState<File | null>(null);
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState<{lat?: number; lng?: number}>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const getGeo = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const uid = user?.id || 'mock-user-1';
    let photoUrl: string | undefined;

    try {
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

      if (supabase) {
        const { error } = await supabase.from('illegal_reports').insert({
          user_id: uid,
          description: desc,
          photo_url: photoUrl,
          geo: loc.lat && loc.lng ? { type: 'Point', coordinates: [loc.lng, loc.lat] } : null,
          status: 'new',
        });
        if (error) throw error;
      } else {
        const list = readLocal();
        list.unshift({
          id: `local-${Date.now()}`,
          user_id: uid,
          description: desc,
          photo_url: photoUrl,
          latitude: loc.lat,
          longitude: loc.lng,
          status: 'new',
          created_at: new Date().toISOString(),
        });
        writeLocal(list);
      }

      setDone(true);
    } catch (err) {
      console.error('Report failed', err);
      alert('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Report submitted</CardTitle>
            <CardDescription>Thank you for helping keep the city clean. Authorities will be notified.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Report Illegal Dumping / Hazard</CardTitle>
          <CardDescription>Attach a photo and location to help authorities respond quickly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input id="photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Describe the issue" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={getGeo}>Use Current Location</Button>
              {loc.lat && loc.lng && <span className="text-sm text-gray-500">Lat {loc.lat.toFixed(4)}, Lng {loc.lng.toFixed(4)}</span>}
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
