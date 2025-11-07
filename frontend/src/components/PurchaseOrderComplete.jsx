import { useState, useEffect } from "react";
import {
  Button,
  Input,
  InputNumber,
  Table,
  Tag,
  Space,
  Form,
  Select,
  Card,
  Popconfirm,
  DatePicker,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Modal,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { canEdit, canDelete, canCreate } from "../service/auth";
import { capitalizeTableText } from "../utils/textUtils";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

const PurchaseOrderComplete = () => {
  const [form] = Form.useForm();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showPODetails, setShowPODetails] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [monthFilter, setMonthFilter] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemForm] = Form.useForm();
  const [poItems, setPoItems] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm] = Form.useForm();
  const [gstInclude, setGstInclude] = useState(false);
  const [selectedProductForForm, setSelectedProductForForm] = useState(null);
  const [poItemTotal, setPoItemTotal] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedSupplierAddress, setSelectedSupplierAddress] = useState(null);

  // Fetch data
  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      // Use Promise.allSettled to fetch dropdowns even if PO endpoint fails
      const results = await Promise.allSettled([
        api.get(`/api/pos?page=${page}&limit=${limit}`),
        api.get("/api/suppliers?limit=1000"),
        api.get("/api/address?limit=1000"),
        api.get("/api/products?limit=1000"),
      ]);

      // Handle PO results
      if (results[0].status === "fulfilled") {
        const posRes = results[0].value;
        setPurchaseOrders(posRes.data.data || []);
        setPagination(prev => ({
          ...prev,
          current: posRes.data.page || page,
          total: posRes.data.total || 0,
          pageSize: posRes.data.limit || limit,
        }));
      } else {
        console.error("Error fetching purchase orders:", results[0].reason);
        setPurchaseOrders([]);
      }

      // Handle suppliers
      if (results[1].status === "fulfilled") {
        const suppliersRes = results[1].value;
        setSuppliers(suppliersRes.data.data || []);
      } else {
        console.error("Error fetching suppliers:", results[1].reason);
        message.error("Failed to load suppliers");
      }

      // Handle addresses
      if (results[2].status === "fulfilled") {
        const addressesRes = results[2].value;
        setAddresses(addressesRes.data.data || []);
      } else {
        console.error("Error fetching addresses:", results[2].reason);
        message.error("Failed to load addresses");
      }

      // Handle products
      if (results[3].status === "fulfilled") {
        const productsRes = results[3].value;
        
        if (productsRes.data && productsRes.data.success) {
          const productsData = productsRes.data.data || [];
          setProducts(productsData);
        } else {
          message.error("Failed to fetch products: Invalid response format");
          setProducts([]);
        }
      } else {
        const errorMessage = results[3].reason?.response?.data?.message 
          || results[3].reason?.response?.data?.error 
          || results[3].reason?.message 
          || "Failed to load products";
        message.error(errorMessage);
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching data", err);
      message.error(err?.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchData(pagination.current, pagination.pageSize);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync GST state with form values
  useEffect(() => {
    const gstValue = createForm.getFieldValue('gstInclude');
    if (gstValue !== undefined) {
      setGstInclude(gstValue);
    }
  }, [createForm]);


  // Watch for GST include changes to trigger re-render
  const handleGstIncludeChange = (value) => {
    setGstInclude(value);
  };

  // Generate PO number for display
  const generatePONumberForDisplay = async () => {
    try {
      const res = await api.get("/api/pos/generate-ref");
      return res.data.refNo;
    } catch (err) {
      message.error("Error generating PO number");
      return "PO/25-26/001"; // Fallback
    }
  };

  // Handle form submit (create or update)
  const handleSubmit = async (values) => {
    // Validate required fields
    if (!values.orderDate) {
      message.error("Please select an order date");
      return;
    }

    if (!values.supplierId) {
      message.error("Please select a supplier");
      return;
    }

    if (poItems.length === 0) {
      message.error("Please add at least one item to the purchase order");
      return;
    }

    // Validate items
    const invalidItems = poItems.filter(item => !item.productId || !item.unitQuantity || item.unitQuantity <= 0);
    if (invalidItems.length > 0) {
      message.error("Please ensure all items have a valid product and quantity");
      return;
    }

    try {
      const payload = {
        // Don't include orderNumber - let backend auto-generate it
        orderDate: values.orderDate ? values.orderDate.format("YYYY-MM-DD") : null,
        gstInclude: values.gstInclude || false,
        gstPercent: values.gstInclude ? (values.gstPercent || 18.0) : 0,
        supplierId: values.supplierId,
        // Don't include addressId and shippingAddressId if null - using supplier address instead
        notes: values.notes || null,
        items: poItems.map(item => ({
          productId: item.productId,
          unitQuantity: item.unitQuantity || 0,
          rate: item.rate || item.unitPrice || 0,
          totalQuantity: item.totalQuantity || null,
          total: item.total || 0
        }))
      };
      
      // Only include orderNumber when UPDATING (editingId exists)
      // For new POs, never include orderNumber - let backend auto-generate
      if (editingId && values.orderNumber && values.orderNumber.trim()) {
        payload.orderNumber = values.orderNumber.trim();
      }
      
      // Only include addressId and shippingAddressId if they have values
      // Since we're using supplier address, we omit these fields

      if (editingId) {
        const res = await api.put(`/api/pos/${editingId}`, payload);
        
        if (res.data && res.data.success) {
          message.success("Purchase order updated successfully");
          setShowForm(false);
          setShowCreateForm(false);
          setEditingId(null);
          setPoItems([]);
          setSelectedSupplierAddress(null);
          form.resetFields();
          createForm.resetFields();
          await fetchData();
        } else {
          const errorMessage = res.data?.message || "Failed to update purchase order";
          message.error(errorMessage);
        }
      } else {
        const res = await api.post("/api/pos", payload);
        
        if (res.data && res.data.success) {
          message.success("Purchase order created successfully");
          setShowForm(false);
          setShowCreateForm(false);
          setEditingId(null);
          setPoItems([]);
          setSelectedSupplierAddress(null);
          form.resetFields();
          createForm.resetFields();
          await fetchData();
        } else {
          const errorMessage = res.data?.message || "Failed to create purchase order";
          message.error(errorMessage);
        }
      }
    } catch (err) {
      
      const errorData = err?.response?.data;
      let errorMessage = "Error saving purchase order";
      
      if (errorData) {
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(e => {
            const field = e.field || e.path || "unknown";
            const msg = e.message || "Validation error";
            return `${field}: ${msg}`;
          }).join(", ");
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage);
    }
  };

  // Handle edit
  // const handleEdit = (record) => {
  //   setEditingId(record.id);
  //   setShowCreateForm(true);
  //   setGstInclude(record.gstInclude);
  //   createForm.setFieldsValue({
  //     ...record,
  //     orderDate: record.orderDate ? dayjs(record.orderDate) : null,
  //     shippingAddressId: record.shippingAddressId || record.addressId, // Default to billing address if no shipping address
  //   });
  //   // Reset GST state when editing
  //   setTimeout(() => {
  //     setGstInclude(record.gstInclude);
  //   }, 100);
  // };

  const handleEdit = async (record) => {
    try {
      setEditingId(record.id);
      setShowCreateForm(true);

      // Fetch full PO details to ensure we have shipping and billing addresses distinctly
      const res = await api.get(`/api/pos/${record.id}`);
      const fullPO = res?.data?.data || record;

      setGstInclude(!!fullPO.gstInclude);

      // Pre-fill PO Items - backend returns items as 'items' (not 'poItems')
      setPoItems((fullPO.items || []).map(pi => ({
        id: pi.id,
        productId: pi.productId,
        unitQuantity: pi.unitQuantity || 0,
        unitPrice: pi.unitPrice || 0,
        rate: pi.unitPrice || 0, // Also include rate for compatibility
        totalQuantity: pi.totalQuantity || 0,
        total: pi.total || (Number(pi.unitQuantity || 0) * Number(pi.unitPrice || 0)),
        product: pi.product || null
      })));

      // Pre-fill form fields with distinct addresses
      createForm.setFieldsValue({
        orderNumber: fullPO.orderNumber,
        orderDate: fullPO.orderDate ? dayjs(fullPO.orderDate) : null,
        gstInclude: !!fullPO.gstInclude,
        gstPercent: fullPO.gstPercent,
        supplierId: fullPO.supplierId,
        addressId: fullPO.addressId,
        shippingAddressId: fullPO.shippingAddressId || undefined,
        notes: fullPO.notes,
      });
      
      // Set supplier address if supplier is loaded
      const supplier = fullPO.supplier || suppliers.find(s => s.id === fullPO.supplierId);
      if (supplier && supplier.address) {
        setSelectedSupplierAddress(supplier.address);
      }
    } catch (e) {
      // Fallback to existing record if detail fetch fails
      setGstInclude(record.gstInclude);
      setPoItems((record.items || []).map(pi => ({
        id: pi.id,
        productId: pi.productId,
        unitQuantity: pi.unitQuantity || 0,
        unitPrice: pi.unitPrice || 0,
        rate: pi.unitPrice || 0,
        totalQuantity: pi.totalQuantity || 0,
        total: pi.total || 0,
        product: pi.product || null
      })));
      createForm.setFieldsValue({
        orderNumber: record.orderNumber,
        orderDate: record.orderDate ? dayjs(record.orderDate) : null,
        gstInclude: record.gstInclude,
        gstPercent: record.gstPercent,
        supplierId: record.supplierId,
        addressId: record.addressId,
        shippingAddressId: record.shippingAddressId || undefined,
        notes: record.notes,
      });
      
      // Set supplier address in fallback
      const supplier = record.supplier || suppliers.find(s => s.id === record.supplierId);
      if (supplier && supplier.address) {
        setSelectedSupplierAddress(supplier.address);
      }
    }
  };


  // Handle delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/pos/${id}`, { data: {} });
      setPurchaseOrders(purchaseOrders.filter((po) => po.id !== id));
      message.success("Purchase order deleted successfully");
    } catch (err) {
      message.error("Error deleting purchase order");
    }
  };

  const markAsReceived = async (record) => {
    try {
      // Fetch full PO details first to get items
      let fullPO = record;
      if (!record.items || record.items.length === 0) {
        try {
          const fetchRes = await api.get(`/api/pos/${record.id}`);
          fullPO = fetchRes?.data?.data || record;
        } catch (fetchErr) {
          console.error("Error fetching PO details:", fetchErr);
          // Continue with record data
        }
      }

      // Prepare items array for update
      const items = (fullPO.items || []).map(item => ({
        productId: item.productId,
        unitPrice: item.unitPrice || item.rate || 0,
        unitQuantity: item.unitQuantity || 0,
        totalQuantity: item.totalQuantity || null,
        total: item.total || 0,
      }));

      // Format orderDate to YYYY-MM-DD format
      let formattedOrderDate = fullPO.orderDate;
      if (fullPO.orderDate) {
        if (typeof fullPO.orderDate === 'string') {
          // If it's already a string, try to parse and format it
          formattedOrderDate = dayjs(fullPO.orderDate).format('YYYY-MM-DD');
        } else if (fullPO.orderDate instanceof Date) {
          formattedOrderDate = dayjs(fullPO.orderDate).format('YYYY-MM-DD');
        } else {
          // If it's a dayjs object or other format
          formattedOrderDate = dayjs(fullPO.orderDate).format('YYYY-MM-DD');
        }
      }

      console.log("🔵 [PO Frontend] Updating PO status to received:", {
        id: record.id,
        status: "received",
        orderDate: formattedOrderDate,
        itemsCount: items.length,
        fullPO: fullPO
      });

      // Update status to "received" using PUT endpoint with items included
      const payload = {
        status: "received",
        orderNumber: fullPO.orderNumber,
        orderDate: formattedOrderDate,
        gstInclude: fullPO.gstInclude || false,
        gstPercent: fullPO.gstPercent || 0,
        supplierId: fullPO.supplierId,
        notes: fullPO.notes || null,
        items: items, // Include items to prevent them from being deleted
      };

      // Only include address fields if they exist
      if (fullPO.addressId) {
        payload.addressId = fullPO.addressId;
      }
      if (fullPO.shippingAddressId) {
        payload.shippingAddressId = fullPO.shippingAddressId;
      }

      console.log("🔵 [PO Frontend] Update payload:", payload);

      const res = await api.put(`/api/pos/${record.id}`, payload);
      
      console.log("✅ [PO Frontend] Status update response:", res.data);
      console.log("✅ [PO Frontend] Response success:", res.data?.success);
      console.log("✅ [PO Frontend] Response data:", res.data?.data);
      
      // Check if the update was successful
      if (res.data && res.data.success) {
        message.success('PO marked as received successfully');
        // Force refresh by fetching current page
        await fetchData(pagination.current, pagination.pageSize);
      } else {
        const errorMessage = res.data?.message || "Failed to update PO status";
        console.error("❌ [PO Frontend] Update failed:", errorMessage);
        message.error(errorMessage);
      }
    } catch (err) {
      console.error("Error marking PO as received:", err);
      console.error("Error response:", err?.response?.data);
      const errorData = err?.response?.data;
      const errorMessage = errorData?.message 
        || (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0
          ? errorData.errors.map(e => `${e.field || "unknown"}: ${e.message}`).join(", ")
          : null)
        || err?.message 
        || "Error marking PO as received";
      message.error(errorMessage);
    }
  };

  // Add item to PO items list
  const addItemToPO = (values) => {
    const selectedProduct = products.find(product => product.id === values.productId);
    if (!selectedProduct) {
      message.error("Product not found");
      return;
    }

    const unitQuantity = Number(values.unitQuantity) || 0;
    const unitPrice = Number(values.unitPrice) || selectedProduct.purchasePrice || 0;
    const productUnitQuantity = selectedProduct.unitQuantity || 1;
    const totalQuantity = unitQuantity * productUnitQuantity;
    const total = Number(values.total) || (unitQuantity * unitPrice);

    const newItem = {
      id: Date.now(), // Temporary ID for frontend
      productId: values.productId,
      unitQuantity: unitQuantity,
      rate: unitPrice,
      unitPrice: unitPrice,
      totalQuantity: totalQuantity,
      total: total,
      product: selectedProduct || null // Ensure product includes unit association
    };

    if (editingItemId) {
      setPoItems(poItems.map(item => item.id === editingItemId ? newItem : item));
      message.success("Item updated in PO");
    } else {
    setPoItems([...poItems, newItem]);
      message.success("Item added to PO");
    }
    
    setShowItemForm(false);
    setEditingItemId(null);
    itemForm.resetFields();
  };

  // Remove item from PO items list
  const removeItemFromPO = (itemId) => {
    setPoItems(poItems.filter(item => item.id !== itemId));
    message.success("Item removed from PO");
  };

  // Calculate totals
  const calculateTotals = () => {
    const subTotal = poItems.reduce((sum, item) => sum + item.total, 0);
    const gstPercent = createForm.getFieldValue('gstPercent') || 18;
    const gstIncludeValue = createForm.getFieldValue('gstInclude');
    const taxTotal = gstIncludeValue ? subTotal * (gstPercent / 100) : 0;
    const grandTotal = subTotal + taxTotal;

    return { subTotal, taxTotal, grandTotal };
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setShowItemForm(true);
    const product = products.find(p => p.id === item.productId);
    setSelectedProductForForm(product || null);
    const total = item.total || (item.unitQuantity * (item.rate || item.unitPrice || product?.purchasePrice || 0));
    itemForm.setFieldsValue({
      productId: item.productId,
      unitQuantity: item.unitQuantity,
      unitPrice: item.rate || item.unitPrice || product?.purchasePrice || 0,
      total: total,
    });
    setPoItemTotal(total);
  };

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/api/poItems/${itemId}`, { data: {} });
      message.success("PO item deleted successfully");
      fetchData(); // Refresh data
    } catch (err) {
      message.error("Error deleting PO item");
    }
  };

  // View PO details
  const viewPODetails = async (record) => {
    try {
      // Fetch full PO details with items
      const res = await api.get(`/api/pos/${record.id}`);
      const fullPO = res?.data?.data || record;
      
      const supplier = fullPO.supplier || suppliers.find(s => s.id === fullPO.supplierId);
      const address = fullPO.billingAddress || addresses.find(a => a.id === fullPO.addressId);
      const shippingAddress = fullPO.shippingAddress || (fullPO.shippingAddressId ? addresses.find(a => a.id === fullPO.shippingAddressId) : null);

      setSelectedPO({
        ...fullPO,
        supplier,
        address,
        shippingAddress,
      });
      setShowPODetails(true);
    } catch (err) {
      console.error("Error fetching PO details:", err);
      // Fallback to record from table
      const supplier = suppliers.find(s => s.id === record.supplierId);
      const address = addresses.find(a => a.id === record.addressId);
      setSelectedPO({
        ...record,
        supplier,
        address,
      });
      setShowPODetails(true);
      message.warning("Could not load full PO details, showing partial information");
    }
  };

  // Generate PO PDF - Exact Format Implementation
  const generatePOPDF = async (po) => {
    try {
      // Fetch full PO details with associations to ensure unit data is available
      let fullPO = po;
      if (po.id) {
        // Always fetch full PO to ensure we have complete data with associations
        try {
          const res = await api.get(`/api/pos/${po.id}`);
          fullPO = res?.data?.data || po;
        } catch (err) {
          console.error("Error fetching full PO for PDF:", err);
          // Continue with existing po data
        }
      }

      const printWindow = window.open("", "_blank");

      // Get supplier and address details
      const supplier = fullPO.supplier;
      const address = fullPO.billingAddress || fullPO.address;
      const shippingAddress = fullPO.shippingAddress;

      // Ensure gstInclude is properly handled (convert string "true"/"false" to boolean, handle null/undefined)
      // Handle multiple possible formats: true, "true", 1, "1", false, "false", 0, "0", null, undefined
      let gstInclude = false;
      if (fullPO.gstInclude !== null && fullPO.gstInclude !== undefined) {
        if (typeof fullPO.gstInclude === 'boolean') {
          gstInclude = fullPO.gstInclude;
        } else if (typeof fullPO.gstInclude === 'string') {
          gstInclude = fullPO.gstInclude.toLowerCase() === 'true' || fullPO.gstInclude === '1';
        } else if (typeof fullPO.gstInclude === 'number') {
          gstInclude = fullPO.gstInclude === 1;
        }
      }
      const gstPercent = fullPO.gstPercent || 0;
      
      // Convert to explicit string values for template
      const gstIncludeText = gstInclude ? 'Yes' : 'No';
      
      // Debug log
      console.log("🔵 [PO PDF] fullPO.gstInclude:", fullPO.gstInclude, "Type:", typeof fullPO.gstInclude);
      console.log("🔵 [PO PDF] Converted gstInclude:", gstInclude);
      console.log("🔵 [PO PDF] gstIncludeText:", gstIncludeText);

    // Calculate totals
    let subTotal = 0;
    let totalGST = 0;
    let grandTotal = 0;

    const itemsWithCalculations = (fullPO.items || []).map((poItem, index) => {
      const unitPrice = poItem.unitPrice || poItem.rate || 0;
      const unitQuantity = poItem.unitQuantity || 0;
      const amount = unitQuantity * unitPrice;
      const gstAmount = gstInclude && gstPercent ? (amount * gstPercent) / 100 : 0;
      const totalAmount = amount + gstAmount;

      subTotal += amount;
      totalGST += gstAmount;
      grandTotal += totalAmount;

      // Ensure product data is preserved with unit association
      const product = poItem.product || {};
      // If unit is missing, try to find it from products array
      let unitData = product.unit;
      if (!unitData && poItem.productId) {
        const productFromArray = products.find(p => p.id === poItem.productId);
        unitData = productFromArray?.unit || null;
      }
      
      return {
        ...poItem,
        product: {
          ...product,
          unit: unitData || product.unit || null
        },
        unitPrice,
        amount,
        gstAmount,
        totalAmount,
        serialNumber: index + 1
      };
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order - ${fullPO.orderNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 10px; 
              font-size: 10px;
              line-height: 1.2;
            }
            .document-border {
              border: 2px solid #000;
              padding: 10px;
              // min-height: 100vh;
              height: auto;
            }
            .company-name { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: center;
              margin-bottom: 3px;
            }
            .contact-row {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .po-title {
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
            }
            .date-po-section {
              text-align: right;
              margin-bottom: 10px;
            }
            .to-section {
              margin: 10px 0;
            }
            .to-section h4 {
              margin: 3px 0;
              font-size: 12px;
            }
            .addresses-section {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
            }
            .address-box {
              width: 48%;
            }
            .address-box h4 {
              margin: 3px 0;
              font-size: 12px;
              text-decoration: underline;
            }
            .subject-section {
              margin: 10px 0;
            }
            .subject-section h4 {
              margin: 3px 0;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 9px;
            }
            table th, table td {
              border: 1px solid #000;
              padding: 4px;
              text-align: left;
            }
            table th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .total-section {
              margin-top: 10px;
              text-align: right;
            }
            .total-section table {
              width: 250px;
              margin-left: auto;
            }
            .footer-section {
              margin-top: 20px;
              text-align: right;
            }
            .signature-line {
              margin-top: 30px;
              border-top: 1px solid #000;
              width: 150px;
              display: inline-block;
            }
            .kind-attention {
              margin: 5px 0;
            }
            .kind-attention h4 {
              margin: 3px 0;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 8px; }
              .document-border { padding: 8px; }
            }
          </style>
        </head>
        <body>
          <div class="document-border">
            <!-- Company Header -->
            <div class="company-name">VENKATESWARA ASSOCIATES</div>
            <div class="contact-row">
              <span>Email: ${address?.email || 'N/A'}</span>
              <span>Phone: ${address?.phone || 'N/A'}</span>
            </div>

            <!-- Title -->
            <div class="po-title">PURCHASE ORDER</div>

            <!-- Date and PO Number -->
            <div class="date-po-section">
              <strong>DATE: ${new Date(fullPO.orderDate).toLocaleDateString('en-GB')}</strong><br>
              <strong>PO NO: ${fullPO.orderNumber || 'N/A'}</strong><br>
              <strong>GST Included: ${gstIncludeText}</strong>
              ${gstInclude && gstPercent ? `<br><strong>GST Percentage: ${gstPercent}%</strong>` : ''}
            </div>

            <!-- To Section -->
            <div class="to-section">
              <h4>To:</h4>
              <div><strong>${supplier?.supplierName ? capitalizeTableText(supplier.supplierName, "supplierName") : 'N/A'}</strong></div>
              <div>${supplier?.address ? capitalizeTableText(supplier.address, "address") : 'N/A'}</div>
              
              <div class="kind-attention">
                <h4>KIND ATTENTION: ${supplier?.supplierName ? capitalizeTableText(supplier.supplierName, "supplierName") : 'N/A'}</h4>
                <div><strong>PH No: ${supplier?.phone || 'N/A'}</strong></div>
              </div>
            </div>

            <!-- Addresses Section -->
            <div class="addresses-section">
              <div class="address-box" style="width: 100%;">
                <h4>SUPPLIER ADDRESS</h4>
                <div>${supplier?.address ? capitalizeTableText(supplier.address, "address") : (address?.addressBill ? capitalizeTableText(address.addressBill, "address") : (address?.addressShip ? capitalizeTableText(address.addressShip, "address") : 'N/A'))}</div>
                ${supplier?.phone ? `<div>Phone: ${supplier.phone}</div>` : address?.phone ? `<div>Phone: ${address.phone || 'N/A'}</div>` : ''}
                ${supplier?.email ? `<div>Email: ${supplier.email}</div>` : address?.email ? `<div>Email: ${address.email || 'N/A'}</div>` : ''}
                <div>GST IN: ${supplier?.gstNumber || 'N/A'}</div>
              </div>
            </div>

            <!-- Subject Section -->
            <div class="subject-section">
              <h4>Sub: Purchase Order of Parts</h4>
              <h4>Dear Sir/mam</h4>
              <div>Kindly Arrange the parts as per PO as soon as earliest.</div>
            </div>

            <!-- Items Table -->
            <table>
              <thead>
                <tr>
                  <th>SN</th>
                  <th>PRODUCT DESCRIPTION</th>
                  <th>UNIT</th>
                  <th>QTY</th>
                  <th>UNIT PRICE</th>
                  <th>AMOUNT</th>
                  ${gstInclude ? `<th>GST ${gstPercent || 0}%</th>` : ''}
                  <th>TOTAL AMT</th>
                </tr>
              </thead>
              <tbody>
                ${itemsWithCalculations.map(item => `
                  <tr>
                    <td class="text-center">${item.serialNumber}</td>
                    <td>${item.product?.productName ? capitalizeTableText(item.product.productName, "productName") : 'N/A'}</td>
                    <td class="text-center">${item.product?.unit?.unitName ? capitalizeTableText(item.product.unit.unitName, "unitName") : 'N/A'}</td>
                    <td class="text-center">${item.unitQuantity || 0}</td>
                    <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">₹${item.amount.toFixed(2)}</td>
                    ${gstInclude ? `<td class="text-right">₹${item.gstAmount.toFixed(2)}</td>` : ''}
                    <td class="text-right">₹${item.totalAmount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Total Section -->
            <div class="total-section">
              <table>
                <tr>
                  <td><strong>Sub Total:</strong></td>
                  <td class="text-right"><strong>₹${subTotal.toFixed(2)}</strong></td>
                </tr>
                ${gstInclude && gstPercent ? `
                <tr>
                  <td><strong>GST (${gstPercent}%):</strong></td>
                  <td class="text-right"><strong>₹${totalGST.toFixed(2)}</strong></td>
                </tr>
                ` : ''}
                <tr>
                  <td><strong>Grand Total:</strong></td>
                  <td class="text-right"><strong>₹${grandTotal.toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>

            ${fullPO.notes ? `
            <!-- Notes Section -->
            <div class="subject-section" style="margin-top: 15px;">
              <h4>Notes:</h4>
              <div>${fullPO.notes}</div>
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer-section">
              <div><strong>FOR VENKATESWARA ASSOCIATES</strong></div>
              <div class="signature-line"></div>
              <div><strong>AUTHORIZED SIGNATURE</strong></div>
            </div>
          </div>
        </body>
      </html>
    `);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      console.error("Error generating PDF:", err);
      message.error("Error generating PDF. Please try again.");
    }
  };


  // Filter data based on date/month
  const getFilteredData = () => {
    let filtered = [...purchaseOrders];

    if (statusFilter) {
      filtered = filtered.filter(po => po.status === statusFilter);
    }

    if (dateFilter && dateFilter.length === 2) {
      const [startDate, endDate] = dateFilter;
      filtered = filtered.filter(po => {
        const poDate = dayjs(po.orderDate);
        return poDate.isAfter(dayjs(startDate).subtract(1, 'day')) &&
          poDate.isBefore(dayjs(endDate).add(1, 'day'));
      });
    }

    if (monthFilter) {
      filtered = filtered.filter(po => {
        const poDate = dayjs(po.orderDate);
        return poDate.format('YYYY-MM') === monthFilter;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(po =>
        po.orderNumber.toString().includes(searchTerm) ||
        po.supplier?.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }


    return filtered;
  };

  // Table columns
  const columns = [
    {
      title: "PO Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      sorter: (a, b) => a.orderNumber - b.orderNumber,
    },
    {
      title: "Order Date",
      dataIndex: "orderDate",
      key: "orderDate",
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
      sorter: (a, b) => dayjs(a.orderDate).unix() - dayjs(b.orderDate).unix(),
    },
    {
      title: "Supplier",
      key: "supplierName",
      render: (_, record) => {
        const supplier = record.supplier || suppliers.find(s => s.id === record.supplierId);
        return capitalizeTableText(supplier?.supplierName, "supplierName") || "-";
      }
    },
    {
      title: "GST Include",
      dataIndex: "gstInclude",
      key: "gstInclude",
      render: (include) => {
        const hasGST = !!include;
        return (
          <Tag color={hasGST ? "green" : "red"}>
            {hasGST ? "Yes" : "No"}
          </Tag>
        );
      },
    },
    {
      title: "Total Amount",
      key: "grandTotal",
      render: (_, record) => {
        // Calculate grandTotal from items
        const items = record.items || [];
        const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const gstPercent = record.gstPercent || 0;
        const gstInclude = record.gstInclude || false;
        const taxTotal = gstInclude ? subTotal * (gstPercent / 100) : 0;
        const grandTotal = subTotal + taxTotal;
        return `₹${grandTotal.toFixed(2)}`;
      },
      sorter: (a, b) => {
        const calcTotal = (po) => {
          const items = po.items || [];
          const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
          const gstPercent = po.gstPercent || 0;
          const gstInclude = po.gstInclude || false;
          const taxTotal = gstInclude ? subTotal * (gstPercent / 100) : 0;
          return subTotal + taxTotal;
        };
        return calcTotal(a) - calcTotal(b);
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 'received' ? 'green' : 'orange'}>
          {status === 'received' ? 'Received' : 'Pending'}
        </Tag>
      ),
    },
    {
      title: "Received By",
      dataIndex: "receivedBy",
      key: "receivedBy",
      render: (receivedBy, record) => {
        if (record.status === 'received') {
          return (
            <div>
              <div>{receivedBy || '-'}</div>
              {record.receivedAt && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {dayjs(record.receivedAt).format('DD/MM/YYYY HH:mm')}
                </div>
              )}
            </div>
          );
        }
        return '-';
      },
    },
    {
      title: "Created By",
      dataIndex: "createdBy",
      key: "createdBy",
      render: (createdBy) => createdBy || "-",
    },
    {
      title: "Updated By",
      dataIndex: "updatedBy",
      key: "updatedBy",
      render: (updatedBy) => updatedBy || "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => viewPODetails(record)}
            title="View Details"
          >
            View
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => generatePOPDF(record).catch(err => console.error("PDF generation error:", err))}
            title="Export PDF"
          >
            PDF
          </Button>

          {record.status === 'pending' ? (
            <Button
              size="small"
              type="primary"
              title="Mark as Received"
              style={{ pointerEvents: 'auto' }}
              onClick={() => markAsReceived(record)}
            >
              Receive
            </Button>
          ) 
          // : record.status === 'received' ? (
          //   <Tag color="green">Received</Tag>
          // ) 
          : null}
          {canEdit() && (
            <Button

              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              title="Edit"
            />
          )}
          {canDelete() && (
            <Popconfirm
              title="Are you sure to delete this purchase order?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button

                icon={<DeleteOutlined />}
                danger
                title="Delete"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Purchase Order Management</Title>
          <Text type="secondary">Complete PO system with PDF export and email integration</Text>
        </div>
        {canCreate() && (
          <Button
            icon={<PlusOutlined />}
            onClick={async () => {
              if (!showCreateForm) {
                // Opening form - generate PO number
                const poNumber = await generatePONumberForDisplay();
                createForm.setFieldValue('orderNumber', poNumber);
                // Ensure GST defaults to No GST on open
                createForm.setFieldValue('gstInclude', false);
                setGstInclude(false);
              }
              setShowCreateForm(!showCreateForm);
              setEditingId(null);
              setPoItems([]);
              if (showCreateForm) {
                createForm.resetFields();
                setGstInclude(false);
                setSelectedSupplierAddress(null);
              }
            }}
            type="primary"
            size="medium"
          >
            {showCreateForm ? "Cancel" : "Create New PO"}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col xs={24} sm={6}>
            <Text strong>Date Range:</Text>
            <DatePicker.RangePicker
              className="w-full mt-1"
              value={dateFilter}
              onChange={setDateFilter}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Text strong>Month:</Text>
            <DatePicker
              picker="month"
              className="w-full mt-1"
              value={monthFilter ? dayjs(monthFilter) : null}
              onChange={(date) => setMonthFilter(date ? date.format('YYYY-MM') : null)}
              placeholder="Select Month"
            />
          </Col>
          <Col xs={24} sm={6}>
            <Text strong>Search:</Text>
            <Input.Search
              className="w-full mt-1"
              placeholder="Search by PO number or supplier"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={6}>
           <div style={{ display: "flex", flexDirection: "column", }}>
             <Text strong>Status:</Text>
            <Select
              placeholder="Filter by Status"
              allowClear
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 140 }}
            >
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="received">Received</Select.Option>
            </Select>
           </div>

          </Col>

          <Col xs={24} sm={6}>
            <Button
              onClick={() => {
                setDateFilter(null);
                setMonthFilter(null);
                setSearchTerm("");
              }}
              disabled={!searchTerm && !statusFilter}
              className="w-full mt-6"
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Create PO Form */}
      {showCreateForm && (
        <Card className="mb-6" title="Create New Purchase Order">
          <Form layout="vertical" form={createForm} onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="orderNumber"
                  label="PO Number (Auto-generated)"
                >
                  <Input
                    className="w-full"
                    placeholder="Will be auto-generated"
                    disabled
                    style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="orderDate"
                  label="Order Date"
                  rules={[{ required: true, message: "Please select order date" }]}
                >
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="supplierId"
                  label="Supplier"
                  rules={[{ required: true, message: "Please select supplier" }]}
                >
                  <Select 
                    placeholder="Select supplier"
                    onChange={(supplierId) => {
                      const supplier = suppliers.find(s => s.id === supplierId);
                      if (supplier && supplier.address) {
                        setSelectedSupplierAddress(supplier.address);
                      } else {
                        setSelectedSupplierAddress(null);
                      }
                    }}
                  >
                    {suppliers.map((supplier) => (
                      <Select.Option key={supplier.id} value={supplier.id}>
                        {capitalizeTableText(supplier.supplierName, "supplierName")}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={24}>
                <Form.Item
                  label="Supplier Address"
                >
                  <Input.TextArea 
                    rows={3}
                    value={selectedSupplierAddress || ""}
                    readOnly
                    placeholder="Select a supplier to view address"
                    style={{ backgroundColor: "#f5f5f5" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="gstInclude"
                  label="GST Included in Item Prices"
                  initialValue={false}
                >
                  <Select onChange={handleGstIncludeChange} value={gstInclude}>
                    <Select.Option value={false}>No GST</Select.Option>
                    <Select.Option value={true}>GST Included in Prices</Select.Option>
                  </Select>
                </Form.Item>
                <div className="text-xs text-gray-500 mt-1">
                  {gstInclude
                    ? "Item prices include GST. GST amount will be calculated separately."
                    : "Item prices are without GST. No tax will be added."
                  }
                </div>
              </Col>
              {gstInclude && (
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="gstPercent"
                    label="GST Percentage"
                    initialValue={18.0}
                    rules={[
                      { required: true, message: "Please enter GST percentage" },
                      { type: "number", min: 0, max: 100 },
                    ]}
                  >
                    <InputNumber
                      className="w-full"
                      min={0}
                      max={100}
                      step={0.01}
                      placeholder="18.00"
                    />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24}>
                <Form.Item
                  name="notes"
                  label="Notes"
                >
                  <TextArea rows={2} placeholder="Enter additional notes" />
                </Form.Item>
              </Col>
            </Row>

            {/* Items Section */}
            <Divider>Items</Divider>

            <div className="flex justify-between items-center mb-4">
              <Title level={4}>PO Items</Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowItemForm(true)}
              >
                Add Item
              </Button>
            </div>

            {poItems.length > 0 ? (
              <Table
                dataSource={poItems}
                columns={[
                  { 
                    title: "Product Name", 
                    key: "productName",
                    render: (_, record) => {
                      const productName = record?.product?.productName || (record?.productId ? products.find(p => p.id === record.productId)?.productName : "-");
                      return capitalizeTableText(productName, "productName");
                    }
                  },
                  { 
                    title: "Barcode", 
                    key: "barCode",
                    render: (_, record) => record?.product?.barCode || (record?.productId ? products.find(p => p.id === record.productId)?.barCode : "-")
                  },
                  { 
                    title: "Unit", 
                    key: "unit", 
                    render: (_, record) => {
                      // Try multiple paths to get unit name
                      const unitName = record?.product?.unit?.unitName 
                        || (record?.productId ? products.find(p => p.id === record.productId)?.unit?.unitName : null);
                      return capitalizeTableText(unitName, "unitName") || "-";
                    }
                  },
                  { title: "Unit Quantity", dataIndex: "unitQuantity", key: "unitQuantity" },
                  { title: "Unit Price (₹)", dataIndex: "rate", key: "rate", render: (rate) => `₹${parseFloat(rate || 0).toFixed(2)}` },
                  { title: "Total Quantity (pieces)", dataIndex: "totalQuantity", key: "totalQuantity" },
                  { title: "Total Price (₹)", dataIndex: "total", key: "total", render: (total) => `₹${parseFloat(total || 0).toFixed(2)}` },
                  {
                    title: "Actions",
                    key: "actions",
                    render: (_, record) => (
                      <Space>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditItem(record)}
                        >
                          Edit
                        </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => removeItemFromPO(record.id)}
                      >
                        Remove
                      </Button>
                      </Space>
                    ),
                  },
                ]}
                pagination={false}
                size="small"
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No items added yet. Click "Add Item" to start.</p>
              </div>
            )}

            {/* Totals */}
            {poItems.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong>Sub Total: ₹{calculateTotals().subTotal.toFixed(2)}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>GST: ₹{calculateTotals().taxTotal.toFixed(2)}</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong className="text-lg">Grand Total: ₹{calculateTotals().grandTotal.toFixed(2)}</Text>
                  </Col>
                </Row>
              </div>
            )}

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={poItems.length === 0}
                >
                  {editingId ? "Update Purchase Order" : "Create Purchase Order"}
                </Button>
                <Button onClick={() => {
                  setShowCreateForm(false);
                  setSelectedSupplierAddress(null);
                  setPoItems([]);
                  createForm.resetFields();
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={getFilteredData()}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />

      {/* PO Details Modal */}
      <Modal
        title={`Purchase Order #${selectedPO?.orderNumber}`}
        open={showPODetails}
        onCancel={() => setShowPODetails(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setShowPODetails(false)}>
            Close
          </Button>,
          <Button
            key="pdf"
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => generatePOPDF(selectedPO).catch(err => console.error("PDF generation error:", err))}
          >
            Export PDF
          </Button>,
        ]}
      >
        {selectedPO && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Title level={4}>Supplier Details</Title>
                <p><strong>Name:</strong> {capitalizeTableText(selectedPO.supplier?.supplierName, "supplierName")}</p>
                <p><strong>Email:</strong> {selectedPO.supplier?.email}</p>
                <p><strong>Phone:</strong> {selectedPO.supplier?.phone}</p>
              </Col>
              <Col span={12}>
                <Title level={4}>Order Details</Title>
                <p><strong>PO Number:</strong> {selectedPO.orderNumber}</p>
                <p><strong>Date:</strong> {selectedPO.orderDate ? dayjs(selectedPO.orderDate).format('DD/MM/YYYY') : '-'}</p>
                <p><strong>Status:</strong> {selectedPO.status ? selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1) : '-'}</p>
                <p><strong>GST Include:</strong> {
                  (() => {
                    const gstValue = selectedPO.gstInclude;
                    if (gstValue === null || gstValue === undefined) return 'No';
                    if (typeof gstValue === 'boolean') return gstValue ? 'Yes' : 'No';
                    if (typeof gstValue === 'string') return (gstValue.toLowerCase() === 'true' || gstValue === '1') ? 'Yes' : 'No';
                    if (typeof gstValue === 'number') return gstValue === 1 ? 'Yes' : 'No';
                    return 'No';
                  })()
                }</p>
                {(() => {
                  const gstValue = selectedPO.gstInclude;
                  const hasGST = gstValue === true || gstValue === "true" || gstValue === 1 || gstValue === "1";
                  return hasGST && (
                    <p><strong>GST Percentage:</strong> {selectedPO.gstPercent || 18}%</p>
                  );
                })()}
              </Col>
            </Row>

            <Divider />

            <div className="flex justify-between items-center mb-4">
              <Title level={4}>Items</Title>
            </div>

            <Table
              dataSource={selectedPO.items || []}
              columns={[
                { 
                  title: "Product Name", 
                  key: "productName",
                  render: (_, record) => {
                    const productName = record?.product?.productName || (record?.productId ? products.find(p => p.id === record.productId)?.productName : "-");
                    return capitalizeTableText(productName, "productName");
                  }
                },
                { 
                  title: "Barcode", 
                  key: "barCode",
                  render: (_, record) => record?.product?.barCode || (record?.productId ? products.find(p => p.id === record.productId)?.barCode : "-")
                },
                { 
                  title: "Unit", 
                  key: "unit", 
                  render: (_, record) => {
                    // Try multiple paths to get unit name
                    const unitName = record?.product?.unit?.unitName 
                      || (record?.productId ? products.find(p => p.id === record.productId)?.unit?.unitName : null);
                    return unitName || "-";
                  }
                },
                { title: "Unit Quantity", dataIndex: "unitQuantity", key: "unitQuantity" },
                { title: "Rate (per unit)", dataIndex: ["unitPrice"], key: "unitPrice", render: (unitPrice) => `₹${(unitPrice || 0).toFixed(2)}` },
                { title: "Total Quantity", dataIndex: "totalQuantity", key: "totalQuantity" },
                { title: "Total Price", dataIndex: "total", key: "total", render: (total) => `₹${(total || 0).toFixed(2)}` },
              ]}
              pagination={false}
              size="small"
            />

            <Divider />

            <Row gutter={16}>
              <Col span={24}>
                <Title level={4}>Supplier Address</Title>
                {selectedPO.supplier?.address ? (
                  <div>
                    <p><strong>Address:</strong> {capitalizeTableText(selectedPO.supplier.address, "address")}</p>
                    {selectedPO.supplier.phone && (
                      <p><strong>Phone:</strong> {selectedPO.supplier.phone}</p>
                    )}
                    {selectedPO.supplier.email && (
                      <p><strong>Email:</strong> {selectedPO.supplier.email}</p>
                    )}
                  </div>
                ) : selectedPO.address ? (
                  <div>
                    <p><strong>Address:</strong> {selectedPO.address.addressBill || selectedPO.address.addressShip}</p>
                    {selectedPO.address.phone && (
                      <p><strong>Phone:</strong> {selectedPO.address.phone}</p>
                    )}
                    {selectedPO.address.email && (
                      <p><strong>Email:</strong> {selectedPO.address.email}</p>
                    )}
                  </div>
                ) : (
                  <p>No address available</p>
                )}
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={24}>
                <Title level={4}>Totals</Title>
                <div>
                  {(() => {
                    // Calculate totals from items dynamically
                    const items = selectedPO.items || [];
                    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                    const gstPercent = selectedPO.gstPercent || 18;
                    const gstInclude = selectedPO.gstInclude || false;
                    const taxTotal = gstInclude ? subTotal * (gstPercent / 100) : 0;
                    const grandTotal = subTotal + taxTotal;
                    
                    return (
                      <>
                        <p><strong>Sub Total:</strong> ₹{subTotal.toFixed(2)}</p>
                        {gstInclude && (
                          <p><strong>GST ({gstPercent}%):</strong> ₹{taxTotal.toFixed(2)}</p>
                        )}
                        <p><strong>Grand Total:</strong> ₹{grandTotal.toFixed(2)}</p>
                      </>
                    );
                  })()}
                </div>
              </Col>
            </Row>

            {selectedPO.notes && (
              <Row gutter={16}>
                <Col span={24}>
                  <Title level={4}>Notes</Title>
                  <p>{selectedPO.notes}</p>
                </Col>
              </Row>
            )}
          </div>
        )}
      </Modal>

      {/* Item Form Modal */}
      <Modal
        title={editingItemId ? "Edit PO Item" : "Add PO Item"}
        open={showItemForm}
        onCancel={() => {
          setShowItemForm(false);
          setEditingItemId(null);
          setSelectedProductForForm(null);
          setPoItemTotal(0);
          itemForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form layout="vertical" form={itemForm} onFinish={addItemToPO}>
          <Form.Item
            name="productId"
            label="Select Product"
            rules={[{ required: true, message: "Please select a product" }]}
          >
            <Select
              placeholder="Select product"
              showSearch
              filterOption={(input, option) =>
                (option?.children?.props?.children || option?.children || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(productId) => {
                const selectedProduct = products.find(product => product.id === productId);
                setSelectedProductForForm(selectedProduct || null);
                if (selectedProduct) {
                  // Auto-fill the unit price with product's unit purchase price
                  itemForm.setFieldsValue({
                    unitPrice: selectedProduct.purchasePrice || 0,
                    unitQuantity: 0,
                    total: 0
                  });
                  setPoItemTotal(0);
                }
              }}
            >
              {products.map((product) => (
                <Select.Option key={product.id} value={product.id}>
                  {capitalizeTableText(product.productName, "productName")} ({product.barCode}) - ₹{product.purchasePrice || 0}/{capitalizeTableText(product.unit?.unitName, "unitName") || 'unit'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedProductForForm ? (
            <>
              <Form.Item
                label="Unit"
              >
                <Input
                  value={selectedProductForForm.unit?.unitName || "-"}
                  disabled
                  style={{ backgroundColor: "#f5f5f5" }}
                />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                    name="unitPrice"
                    label="Price per Unit (₹)"
                    rules={[{ required: true, message: "Please enter unit price" }]}
              >
                <InputNumber
                  className="w-full"
                      min={0}
                      step={0.01}
                      precision={2}
                      placeholder="Unit price"
                  onChange={(value) => {
                        const quantity = itemForm.getFieldValue('unitQuantity') || 0;
                        const total = (quantity * value) || 0;
                        itemForm.setFieldsValue({ total });
                        setPoItemTotal(total);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                    name="unitQuantity"
                    label="Quantity"
                    rules={[{ required: true, message: "Please enter quantity" }]}
              >
                <InputNumber
                  className="w-full"
                      min={0.1}
                      step={0.1}
                      precision={1}
                      placeholder="Enter quantity"
                  onChange={(value) => {
                        const unitPrice = itemForm.getFieldValue('unitPrice') || 0;
                        const total = (value * unitPrice) || 0;
                        itemForm.setFieldsValue({ total });
                        setPoItemTotal(total);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

              <Form.Item
                label="Total (₹)"
              >
                <Input
                  value={`₹${poItemTotal.toFixed(2)}`}
                  disabled
                  style={{ 
                    backgroundColor: "#f0f0f0", 
                    fontWeight: "bold",
                    fontSize: "16px",
                    color: "#52c41a"
                  }}
                />
              </Form.Item>
              
              <Form.Item name="total" hidden>
                <InputNumber value={poItemTotal} />
              </Form.Item>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
              Please select a product first
            </div>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItemId ? "Update Item" : "Add Item"}
              </Button>
              <Button onClick={() => {
                setShowItemForm(false);
                setEditingItemId(null);
                setSelectedProductForForm(null);
                setPoItemTotal(0);
                itemForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default PurchaseOrderComplete;
