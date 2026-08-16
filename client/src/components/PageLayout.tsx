import { MotionConfig } from "framer-motion";
import AnnouncementBar from "./AnnouncementBar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import PageTransition from "./motion/PageTransition";

interface PageLayoutProps {
  children: React.ReactNode;
  noFooter?: boolean;
}

export default function PageLayout({ children, noFooter = false }: PageLayoutProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <AnnouncementBar />
        <Navbar />
        <main id="main" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        {!noFooter && <Footer />}
      </div>
    </MotionConfig>
  );
}
