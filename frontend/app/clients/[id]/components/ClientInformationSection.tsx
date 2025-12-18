'use client';

import { Edit, Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { type Client, clientsApi } from '@/lib/api';

interface ClientInformationSectionProps {
  client: Client;
  onClientUpdate: (updatedClient: Client) => void;
}

export function ClientInformationSection({
  client,
  onClientUpdate,
}: ClientInformationSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Contact and basics</CardDescription>
        </div>
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

