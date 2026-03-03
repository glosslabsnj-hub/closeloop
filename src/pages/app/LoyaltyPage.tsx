import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Star,
  Gift,
  Users,
  Settings,
  Plus,
  Loader2,
  Trophy,
  Coins,
  Search,
} from "lucide-react";
import { useLoyalty, LoyaltyBalance } from "@/hooks/useLoyalty";
import { useCustomers } from "@/hooks/useCustomers";
import { useModuleRequired } from "@/hooks/useModuleRequired";

function formatPoints(points: number): string {
  return points.toLocaleString();
}

const tierConfig: Record<string, { color: string; minPoints: number }> = {
  member: { color: "bg-gray-100 text-gray-700", minPoints: 0 },
  silver: { color: "bg-gray-200 text-gray-800", minPoints: 500 },
  gold: { color: "bg-yellow-100 text-yellow-700", minPoints: 1500 },
  platinum: { color: "bg-purple-100 text-purple-700", minPoints: 5000 },
};

export default function LoyaltyPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["food_orders", "reservations"]);
  const {
    program,
    rewards,
    members,
    isLoading,
    updateProgram,
    createReward,
    earnPoints,
    redeemPoints,
  } = useLoyalty();
  const { customers } = useCustomers();

  const [searchQuery, setSearchQuery] = useState("");
  const [addRewardOpen, setAddRewardOpen] = useState(false);
  const [earnPointsOpen, setEarnPointsOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LoyaltyBalance | null>(null);

  // Reward form
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardPoints, setRewardPoints] = useState("");
  const [rewardType, setRewardType] = useState<"discount" | "free_item" | "percentage_off">("discount");
  const [rewardValue, setRewardValue] = useState("");

  // Earn points form
  const [earnCustomerId, setEarnCustomerId] = useState("");
  const [earnAmount, setEarnAmount] = useState("");

  // Redeem form
  const [selectedRewardId, setSelectedRewardId] = useState("");

  const filteredMembers = members.filter(
    (m) =>
      !searchQuery ||
      m.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.customer?.phone_e164?.includes(searchQuery)
  );

  const handleAddReward = async () => {
    await createReward.mutateAsync({
      name: rewardName,
      description: rewardDescription || undefined,
      points_required: parseInt(rewardPoints),
      reward_type: rewardType,
      reward_value_cents: rewardType === "discount" ? Math.round(parseFloat(rewardValue) * 100) : undefined,
      reward_percentage: rewardType === "percentage_off" ? parseInt(rewardValue) : undefined,
    });
    setAddRewardOpen(false);
    resetRewardForm();
  };

  const handleEarnPoints = async () => {
    if (!program) return;
    const orderAmount = parseFloat(earnAmount);
    const pointsToEarn = Math.floor(orderAmount * program.points_per_dollar);

    await earnPoints.mutateAsync({
      customer_id: earnCustomerId,
      points: pointsToEarn,
      notes: `Earned from $${orderAmount} purchase`,
    });
    setEarnPointsOpen(false);
    setEarnCustomerId("");
    setEarnAmount("");
  };

  const handleRedeem = async () => {
    if (!selectedMember) return;
    await redeemPoints.mutateAsync({
      customer_id: selectedMember.customer_id,
      reward_id: selectedRewardId,
    });
    setRedeemOpen(false);
    setSelectedMember(null);
    setSelectedRewardId("");
  };

  const resetRewardForm = () => {
    setRewardName("");
    setRewardDescription("");
    setRewardPoints("");
    setRewardType("discount");
    setRewardValue("");
  };

  const openRedeemDialog = (member: LoyaltyBalance) => {
    setSelectedMember(member);
    setRedeemOpen(true);
  };

  if (moduleLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalMembers = members.length;
  const totalPoints = members.reduce((sum, m) => sum + m.points_balance, 0);
  const lifetimePoints = members.reduce((sum, m) => sum + m.lifetime_points, 0);

  return (
    <ErrorBoundary context="loading your loyalty program">
      <PageContainer maxWidth="xl">
        <PageHeader
          icon={<Star className="h-5 w-5" />}
          title="Loyalty Program"
          description="Reward your customers and drive repeat business"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEarnPointsOpen(true)}>
                <Coins className="h-4 w-4 mr-2" />
                Award Points
              </Button>
              <Button onClick={() => setAddRewardOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground">Enrolled customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points in Circulation</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPoints(totalPoints)}</div>
              <p className="text-xs text-muted-foreground">Unredeemed points</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lifetime Points</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPoints(lifetimePoints)}</div>
              <p className="text-xs text-muted-foreground">Total points earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rewards Available</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rewards.length}</div>
              <p className="text-xs text-muted-foreground">Active rewards</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="settings">Program Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Loyalty Members</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredMembers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No loyalty members yet. Points are automatically earned on purchases.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredMembers.map((member) => {
                      const tier = tierConfig[member.tier] || tierConfig.member;
                      const availableRewards = rewards.filter(
                        (r) => r.points_required <= member.points_balance
                      );

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Star className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {member.customer?.full_name || "Unknown"}
                                </p>
                                <Badge className={tier.color}>
                                  {member.tier.charAt(0).toUpperCase() + member.tier.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {member.customer?.email || member.customer?.phone_e164}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold">{formatPoints(member.points_balance)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatPoints(member.lifetime_points)} lifetime
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRedeemDialog(member)}
                              disabled={availableRewards.length === 0}
                            >
                              <Gift className="h-4 w-4 mr-2" />
                              Redeem
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Rewards</CardTitle>
                <CardDescription>Rewards customers can redeem with their points</CardDescription>
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">No rewards created yet</p>
                    <Button onClick={() => setAddRewardOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Reward
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {rewards.map((reward) => (
                      <Card key={reward.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold">{reward.name}</h3>
                              {reward.description && (
                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                              )}
                            </div>
                            <Gift className="h-5 w-5 text-primary" />
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <Badge variant="secondary">
                              {reward.reward_type === "discount" && `$${(reward.reward_value_cents || 0) / 100} off`}
                              {reward.reward_type === "percentage_off" && `${reward.reward_percentage}% off`}
                              {reward.reward_type === "free_item" && "Free Item"}
                            </Badge>
                            <span className="font-bold text-primary">
                              {formatPoints(reward.points_required)} pts
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Program Settings</CardTitle>
                <CardDescription>Configure how customers earn and redeem points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Points per $1 spent</Label>
                    <Input
                      type="number"
                      value={program?.points_per_dollar || 1}
                      onChange={(e) =>
                        updateProgram.mutate({ points_per_dollar: parseInt(e.target.value) || 1 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Customers earn this many points for every dollar spent
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Signup Bonus Points</Label>
                    <Input
                      type="number"
                      value={program?.points_for_signup || 0}
                      onChange={(e) =>
                        updateProgram.mutate({ points_for_signup: parseInt(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Bonus points awarded when a customer enrolls
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-4">Tier Thresholds</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(tierConfig).map(([tier, config]) => (
                      <div key={tier} className="text-center p-4 border rounded-lg">
                        <Badge className={config.color}>{tier}</Badge>
                        <p className="text-sm mt-2">{formatPoints(config.minPoints)}+ pts</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContainer>

      {/* Add Reward Dialog */}
      <Dialog open={addRewardOpen} onOpenChange={setAddRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Reward</DialogTitle>
            <DialogDescription>Add a new reward for customers to redeem</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reward Name *</Label>
              <Input
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                placeholder="e.g., $5 Off Your Order"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points Required *</Label>
                <Input
                  type="number"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Reward Type</Label>
                <Select value={rewardType} onValueChange={(v) => setRewardType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Fixed Discount ($)</SelectItem>
                    <SelectItem value="percentage_off">Percentage Off (%)</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {rewardType !== "free_item" && (
              <div className="space-y-2">
                <Label>{rewardType === "discount" ? "Discount Amount ($)" : "Percentage Off"}</Label>
                <Input
                  type="number"
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  placeholder={rewardType === "discount" ? "5.00" : "10"}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRewardOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddReward}
              disabled={!rewardName || !rewardPoints || createReward.isPending}
            >
              {createReward.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Earn Points Dialog */}
      <Dialog open={earnPointsOpen} onOpenChange={setEarnPointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Points</DialogTitle>
            <DialogDescription>Award points to a customer based on purchase amount</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={earnCustomerId} onValueChange={setEarnCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || c.phone_e164 || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purchase Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                value={earnAmount}
                onChange={(e) => setEarnAmount(e.target.value)}
                placeholder="25.00"
              />
            </div>
            {earnAmount && program && (
              <p className="text-sm text-muted-foreground">
                Customer will earn <strong>{Math.floor(parseFloat(earnAmount) * program.points_per_dollar)}</strong> points
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEarnPointsOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEarnPoints}
              disabled={!earnCustomerId || !earnAmount || earnPoints.isPending}
            >
              {earnPoints.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Award Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Reward</DialogTitle>
            <DialogDescription>
              {selectedMember?.customer?.full_name} has {formatPoints(selectedMember?.points_balance || 0)} points
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Reward *</Label>
              <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reward" />
                </SelectTrigger>
                <SelectContent>
                  {rewards
                    .filter((r) => r.points_required <= (selectedMember?.points_balance || 0))
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({formatPoints(r.points_required)} pts)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRedeem}
              disabled={!selectedRewardId || redeemPoints.isPending}
            >
              {redeemPoints.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
