// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./shared/Layout";
import Login from "./shared/Login";
import ProtectedRoute from "./service/ProtectedRoute";
import Dashboard from "./components/Dashboard";
import BrandManagement from "./components/BrandManagement";
import CategoryManagement from "./components/CategoryManagement";
import CustomerManagement from "./components/CustomerManagement";
import UnitManagement from "./components/UnitManagement";
import ProductManagement from "./components/ProductManagement";
import PurchaseOrderComplete from "./components/PurchaseOrderComplete";
import SupplierManagement from "./components/SupplierManagement";
import UserManagement from "./components/UserManagement";
import Reports from "./components/Reports";
import ItemStockReport from "./components/ItemStockReport";
import AddressManagement from "./components/AddressManagement";
import InventoryManagement from "./components/InventoryManagement";
import NotFound from "./components/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes (require JWT) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            {/* Redirect root to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Main routes */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="brand" element={<BrandManagement />} />
            <Route path="category" element={<CategoryManagement />} />
            <Route path="customer" element={<CustomerManagement />} />
            <Route path="unit" element={<UnitManagement />} />
            <Route path="product" element={<ProductManagement />} />
            <Route path="inventory-management" element={<InventoryManagement />} />
            <Route path="supplier" element={<SupplierManagement />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="address" element={<AddressManagement />} />

            {/* Purchase Order */}
            <Route path="purchase-order" element={<PurchaseOrderComplete />} />

            {/* Reports sub-routes */}
            <Route path="reports" element={<Reports />} />
            <Route path="reports/item-stock" element={<ItemStockReport />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
