import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import {
  useProAssociationRequests,
  useUpdateAssociationRequest,
} from "@/modules/user-management/hooks/useUserManagementQuery";
import { Check, X, Loader2 } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
};

const ProAssociationRequestsPage = () => {
  const { user } = useAuthContext();
  const authUserId = user?.id;
  const { data: requests = [], isLoading, isError, error, refetch } = useProAssociationRequests(authUserId);
  const updateRequest = useUpdateAssociationRequest();

  const pendingCount = requests.filter((request) => request.status === "pending").length;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Association Requests</h1>
          <p className="text-muted-foreground">
            Review business association requests. History stays here even after notifications are read.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending requests: {pendingCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading requests...
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <p className="text-destructive font-medium">Could not load association requests</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No association requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{request.business_name || "Unknown business"}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested on {new Date(request.created_at).toLocaleString()}
                        </p>
                        {request.message && (
                          <p className="text-sm text-muted-foreground mt-1">{request.message}</p>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[request.status] || "outline"}>
                        {request.status}
                      </Badge>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateRequest.mutate({ requestId: request.id, status: "accepted" })
                          }
                          disabled={updateRequest.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateRequest.mutate({ requestId: request.id, status: "rejected" })
                          }
                          disabled={updateRequest.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProAssociationRequestsPage;
