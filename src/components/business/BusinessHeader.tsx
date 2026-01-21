import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { User, Building2 } from "lucide-react";

export function BusinessHeader() {
  const { settings, isCustomized } = useBusiness();
  const { profile } = useAuth();

  if (!isCustomized) return null;

  return (
    <div className="w-full border-b bg-muted/30 py-2">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.companyLogo ? (
            <img 
              src={settings.companyLogo} 
              alt={settings.companyName}
              className="h-8 max-w-24 object-contain"
            />
          ) : (
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: `hsl(${settings.primaryColor})` }}
            >
              {settings.companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p 
              className="font-semibold text-sm"
              style={{ color: `hsl(${settings.primaryColor})` }}
            >
              {settings.companyName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          {settings.consultantName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{settings.consultantName}</span>
            </div>
          )}
          {profile?.full_name && !settings.consultantName && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{profile.full_name}</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" />
            Business
          </Badge>
        </div>
      </div>
    </div>
  );
}
