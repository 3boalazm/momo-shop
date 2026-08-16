import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import PageLayout from "./components/PageLayout";
import LoadingScreen from "./components/LoadingScreen";

// Eager: above-the-fold / most-visited routes
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import NotFound from "@/pages/NotFound";

// Lazy: heavier or less-frequent routes (code-split into separate chunks)
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Auth = lazy(() => import("@/pages/Auth"));
const Profile = lazy(() => import("@/pages/Profile"));
const Wishlist = lazy(() => import("@/pages/Wishlist"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const TrackOrder = lazy(() => import("@/pages/TrackOrder"));

// Lightweight loading fallback
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <PageLayout>
          <Home />
        </PageLayout>
      </Route>
      <Route path="/shop">
        <PageLayout>
          <Shop />
        </PageLayout>
      </Route>
      <Route path="/product/:slug">
        {(params) => (
          <PageLayout>
            <Suspense fallback={<RouteLoader />}>
              <ProductDetail params={params} />
            </Suspense>
          </PageLayout>
        )}
      </Route>
      <Route path="/about">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <About />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/contact">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <Contact />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/cart">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <Cart />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/checkout">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <Checkout />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/wishlist">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <Wishlist />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/track">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <TrackOrder />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/profile">
        <PageLayout>
          <Suspense fallback={<RouteLoader />}>
            <Profile />
          </Suspense>
        </PageLayout>
      </Route>
      <Route path="/auth">
        <div className="min-h-screen">
          <Suspense fallback={<RouteLoader />}>
            <Auth />
          </Suspense>
        </div>
      </Route>
      <Route path="/admin">
        <Suspense fallback={<RouteLoader />}>
          <AdminDashboard />
        </Suspense>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <TooltipProvider>
                <LoadingScreen />
                <Toaster />
                <Router />
              </TooltipProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
