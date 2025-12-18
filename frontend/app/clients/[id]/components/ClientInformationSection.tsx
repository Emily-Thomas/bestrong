'use client';

import { Edit, Loader2, Save, UserCheck } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type Client,
  type Recommendation,
  clientsApi,
  recommendationsApi,
} from '@/lib/api';

interface ClientInformationSectionProps {
  client: Client;
  recommendation: Recommendation | null;
  onClientUpdate: (updatedClient: Client) => void;
  onRecommendationUpdate?: (recommendation: Recommendation | null) => void;
}

export function ClientInformationSection({
  client,
  recommendation,
  onClientUpdate,
  onRecommendationUpdate,
}: ClientInformationSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email || '',
    phone: client.phone || '',
    date_of_birth: client.date_of_birth
      ? new Date(client.date_of_birth).toISOString().split('T')[0]
      : '',
  });

  const handleSave = async () => {
    setError('');
    setSaving(true);

    const response = await clientsApi.update(client.id, formData);
    if (response.success && response.data) {
      onClientUpdate(response.data);
      setEditing(false);
    } else {
      setError(response.error || 'Failed to update client');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email || '',
      phone: client.phone || '',
      date_of_birth: client.date_of_birth
        ? new Date(client.date_of_birth).toISOString().split('T')[0]
        : '',
    });
    setEditing(false);
    setError('');
  };

  const handleActivate = async () => {
    if (!recommendation) {
      setError('No recommendation available to activate');
      return;
    }

    setActivating(true);
    setError('');

    try {
      const response = await recommendationsApi.activateClient(
        client.id,
        recommendation.id
      );
      if (response.success && response.data) {
        onClientUpdate(response.data.client);
        if (onRecommendationUpdate) {
          onRecommendationUpdate(response.data.recommendation);
        }
      } else {
        setError(response.error || 'Failed to activate client');
      }
    } catch (err) {
      setError('Failed to activate client');
    } finally {
      setActivating(false);
    }
  };

  const getStatusBadge = (status?: Client['status']) => {
    switch (status) {
      case 'prospect':
        return <Badge variant="outline">Prospect</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">Prospect</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Client Information</CardTitle>
            {getStatusBadge(client.status)}
          </div>
          <CardDescription>Contact and basics</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {(client.status === 'prospect' || !client.status) && recommendation && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm" disabled={activating}>
                  {activating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate Client
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Activate Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will activate the client and accept the current recommendation.
                    All workouts will be marked as scheduled and ready to execute.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={activating}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleActivate} disabled={activating}>
                    {activating ? 'Activating...' : 'Activate'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-6"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      first_name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      last_name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      date_of_birth: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Status
              </dt>
              <dd className="text-sm">{getStatusBadge(client.status)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                First Name
              </dt>
              <dd className="text-sm">{client.first_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Last Name
              </dt>
              <dd className="text-sm">{client.last_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Email
              </dt>
              <dd className="text-sm">{client.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Phone
              </dt>
              <dd className="text-sm">{client.phone || 'Not provided'}</dd>
            </div>
            {client.date_of_birth && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1">
                  Date of Birth
                </dt>
                <dd className="text-sm">
                  {new Date(client.date_of_birth).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

