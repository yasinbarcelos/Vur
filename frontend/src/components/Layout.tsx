import { ReactNode } from "react";
import Navbar from "./Navbar";
import MockModeIndicator from "./debug/MockModeIndicator";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
      <MockModeIndicator />
    </div>
  );
};

export default Layout; 