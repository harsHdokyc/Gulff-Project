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
import { useTranslation } from "react-i18next";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
};

const ProAssociationRequestsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const authUserId = user?.id;
  const { data: requests = [], isLoading, isError, error, refetch } = useProAssociationRequests(authUserId);
  const updateRequest = useUpdateAssociationRequest();

  const pendingCount = requests.filter((request) => request.status === "pending").length;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('associationRequests.proAssociationRequests.title')}</h1>
          <p className="text-muted-foreground">
            {t('associationRequests.proAssociationRequests.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('associationRequests.proAssociationRequests.pendingRequests', { count: pendingCount })}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {t('associationRequests.proAssociationRequests.loadingRequests')}
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <p className="text-destructive font-medium">{t('associationRequests.proAssociationRequests.couldNotLoadRequests')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : t('associationRequests.proAssociationRequests.unknownError')}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => refetch()}>
                  {t('common.retry')}
                </Button>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {t('associationRequests.proAssociationRequests.noAssociationRequestsYet')}
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{request.business_name || t('associationRequests.proAssociationRequests.unknownBusiness')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('associationRequests.proAssociationRequests.requestedOn')} {new Date(request.created_at).toLocaleString()}
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
                          {t('associationRequests.accept')}
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
                          {t('associationRequests.reject')}
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
