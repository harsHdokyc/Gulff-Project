import { ReactNode } from "react";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
import ScrollProgress from "./ScrollProgress";
import { useLenis } from "@/hooks/useLenis";

const PublicLayout = ({ children }: { children: ReactNode }) => {
  useLenis();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ScrollProgress />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
