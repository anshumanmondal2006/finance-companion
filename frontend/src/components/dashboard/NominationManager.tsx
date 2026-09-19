import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Gift, Trash2, Edit2, Check, Loader2, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { addNomination, getNomination, deleteNomination, NominationData } from '@/lib/nominationApi';
import { toast } from '@/hooks/use-toast';

const NominationManager = ({ ageGroup }: { ageGroup?: string }) => {
  const storeAgeGroup = useStore().ageGroup;
  const currentAgeGroup = ageGroup || storeAgeGroup;
  const [nomination, setNomination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [formData, setFormData] = useState<NominationData>({
    nomineeName: '',
    nomineeEmail: '',
    nomineePhone: '',
    relationship: 'Child',
    personalMessage: '',
    assetDistribution: {},
  });

  // Only show this component to elderly users
  if (currentAgeGroup !== 'elderly') {
    return null;
  }

  useEffect(() => {
    loadNomination();
  }, []);

  const loadNomination = async () => {
    try {
      setIsLoading(true);
      const data = await getNomination();
      if (data) {
        setNomination(data.nomination);
        setFormData({
          nomineeName: data.nomination.nomineeName || '',
          nomineeEmail: data.nomination.nomineeEmail || '',
          nomineePhone: data.nomination.nomineePhone || '',
          relationship: data.nomination.relationship || 'Child',
          personalMessage: data.nomination.personalMessage || '',
          assetDistribution: data.nomination.assetDistribution || {},
        });
      }
    } catch (error) {
      console.error('Failed to load nomination:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNomination = async () => {
    if (!formData.nomineeName || !formData.nomineeEmail || !formData.nomineePhone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      await addNomination(formData);
      toast({
        title: 'Success',
        description: 'Nomination saved successfully',
      });
      setIsDialogOpen(false);
      await loadNomination();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save nomination',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNomination = async () => {
    try {
      setIsSaving(true);
      await deleteNomination();
      toast({
        title: 'Success',
        description: 'Nomination deleted successfully',
      });
      setNomination(null);
      setFormData({
        nomineeName: '',
        nomineeEmail: '',
        nomineePhone: '',
        relationship: 'Child',
        personalMessage: '',
        assetDistribution: {},
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete nomination',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Gift className="h-4 w-4 text-amber-600" />
        <CardTitle className="text-sm font-medium">Legacy Nomination</CardTitle>
      </CardHeader>
      <CardContent>
        {nomination && nomination.nomineeName ? (
          <div className="space-y-3">
            {/* Collapsible Header */}
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-xs">
                      {nomination.nomineeName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {nomination.nomineeName}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {nomination.relationship}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-600 transition-transform ${
                      isDetailsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>

              {/* Collapsible Details */}
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase">Email</p>
                    <p className="text-sm text-slate-700 break-all">{nomination.nomineeEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Phone</p>
                    <p className="text-sm text-slate-700">{nomination.nomineePhone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Relationship</p>
                    <p className="text-sm text-slate-700">{nomination.relationship}</p>
                  </div>
                  {nomination.personalMessage && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase">Message</p>
                      <p className="text-sm text-slate-700 italic">{nomination.personalMessage}</p>
                    </div>
                  )}
                  {nomination.acknowledgedByNominee && (
                    <div className="col-span-2 flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Acknowledged by nominee</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Legacy Nomination</DialogTitle>
                        <DialogDescription>Update your legacy nomination details</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nomineeName">Nominee Name *</Label>
                          <Input
                            id="nomineeName"
                            value={formData.nomineeName}
                            onChange={(e) =>
                              setFormData({ ...formData, nomineeName: e.target.value })
                            }
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nomineeEmail">Email *</Label>
                          <Input
                            id="nomineeEmail"
                            type="email"
                            value={formData.nomineeEmail}
                            onChange={(e) =>
                              setFormData({ ...formData, nomineeEmail: e.target.value })
                            }
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nomineePhone">Phone Number *</Label>
                          <Input
                            id="nomineePhone"
                            type="tel"
                            value={formData.nomineePhone}
                            onChange={(e) =>
                              setFormData({ ...formData, nomineePhone: e.target.value })
                            }
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="relationship">Relationship *</Label>
                          <Select
                            value={formData.relationship}
                            onValueChange={(v) =>
                              setFormData({ ...formData, relationship: v })
                            }
                          >
                            <SelectTrigger id="relationship">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Friend">Friend</SelectItem>
                              <SelectItem value="Charity">Charity/Organization</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
                          <Textarea
                            id="personalMessage"
                            value={formData.personalMessage || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, personalMessage: e.target.value })
                            }
                            placeholder="Share a personal message for the nominee..."
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveNomination} disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Nomination</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this nomination? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteNomination}
                          disabled={isSaving}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isSaving ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Secure your legacy by nominating someone to inherit your assets and wealth.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Gift className="h-4 w-4 mr-2" />
                  Add Nomination
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Legacy Nomination</DialogTitle>
                  <DialogDescription>
                    Nominate a person to inherit your wealth and assets
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomineeName">Nominee Name *</Label>
                    <Input
                      id="nomineeName"
                      value={formData.nomineeName}
                      onChange={(e) =>
                        setFormData({ ...formData, nomineeName: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomineeEmail">Email *</Label>
                    <Input
                      id="nomineeEmail"
                      type="email"
                      value={formData.nomineeEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, nomineeEmail: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomineePhone">Phone Number *</Label>
                    <Input
                      id="nomineePhone"
                      type="tel"
                      value={formData.nomineePhone}
                      onChange={(e) =>
                        setFormData({ ...formData, nomineePhone: e.target.value })
                      }
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <Select
                      value={formData.relationship}
                      onValueChange={(v) =>
                        setFormData({ ...formData, relationship: v })
                      }
                    >
                      <SelectTrigger id="relationship">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Friend">Friend</SelectItem>
                        <SelectItem value="Charity">Charity/Organization</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
                    <Textarea
                      id="personalMessage"
                      value={formData.personalMessage || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, personalMessage: e.target.value })
                      }
                      placeholder="Share a personal message for the nominee..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNomination} disabled={isSaving}>
                    {isSaving ? 'Creating...' : 'Create Nomination'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NominationManager;
