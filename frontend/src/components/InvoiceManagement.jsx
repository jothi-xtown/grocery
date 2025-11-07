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
  DollarOutlined,
  EyeOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { canEdit, canDelete, canCreate } from "../service/auth";
import { capitalizeTableText } from "../utils/textUtils";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

const InvoiceManagement = () => {
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [formType, setFormType] = useState("invoice"); // Always invoice
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  // Fetch data
  useEffect(() => {
    fetchCustomers();
    fetchBranches();
    fetchProducts();
    fetchBills();
  }, []);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await api.get("/api/customers?limit=1000");
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error("Error fetching customers", err);
    }
  };

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const res = await api.get("/api/branches?limit=1000");
      setBranches(res.data.data || []);
    } catch (err) {
      console.error("Error fetching branches", err);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      console.log("🔵 [Invoice] Fetching products...");
      const res = await api.get("/api/products?limit=1000");
      console.log("🔵 [Invoice] Products API Response:", res.data);
      
      if (res.data && res.data.success) {
        const productsData = res.data.data || [];
        console.log(`✅ [Invoice] Products fetched successfully: ${productsData.length} products`);
        setProducts(productsData);
      } else {
        console.error("❌ [Invoice] Invalid response format:", res.data);
        message.error("Failed to fetch products: Invalid response format");
        setProducts([]);
      }
    } catch (err) {
      console.error("❌ [Invoice] Error fetching products:", err);
      console.error("❌ [Invoice] Error response:", err?.response);
      const errorMessage = err?.response?.data?.message 
        || err?.response?.data?.error 
        || err?.message 
        || "Failed to fetch products";
      message.error(errorMessage);
      setProducts([]);
    }
  };

  // Fetch invoices only
  const fetchBills = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const url = `/api/bill?page=${page}&limit=${limit}`;
      const res = await api.get(url);
      const allBills = res.data.data || [];
      // Filter to show only invoices
      const invoicesData = allBills.filter((bill) => bill.type === "invoice");

      setBills(invoicesData);
      setPagination((prev) => ({
        ...prev,
        current: res.data.page || page,
        total: invoicesData.length,
        pageSize: res.data.limit || limit,
      }));
    } catch (err) {
      console.error("Error fetching bills", err);
      message.error("Error fetching bills");
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchBills(pagination.current, pagination.pageSize);
  };

  // Calculate item total
  const calculateItemTotal = (quantity, unitPrice, discountPercent = 0, taxPercent = 0) => {
    const lineAmount = quantity * unitPrice;
    const discount = (lineAmount * discountPercent) / 100;
    const taxable = lineAmount - discount;
    const tax = (taxable * taxPercent) / 100;
    return taxable + tax;
  };

  // Calculate bill totals
  const calculateTotals = () => {
    const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = billItems.reduce((sum, item) => {
      const lineAmount = item.quantity * item.unitPrice;
      return sum + (lineAmount * (item.discountPercent || 0) / 100);
    }, 0);
    const totalTax = billItems.reduce((sum, item) => {
      const lineAmount = item.quantity * item.unitPrice;
      const discount = lineAmount * (item.discountPercent || 0) / 100;
      const taxable = lineAmount - discount;
      return sum + (taxable * (item.taxPercent || 0) / 100);
    }, 0);
    const grandTotal = subtotal - totalDiscount + totalTax;
    return { subtotal, totalDiscount, totalTax, grandTotal };
  };

  // Handle add item
  const handleAddItem = async (values) => {
    console.log("🔵 [Invoice] handleAddItem called with values:", values);
    console.log("🔵 [Invoice] Current products count:", products.length);
    console.log("🔵 [Invoice] Current billItems count:", billItems.length);
    console.log("🔵 [Invoice] Editing item ID:", editingItemId);
    
    // Validate products array
    if (!products || products.length === 0) {
      console.error("❌ [Invoice] Products array is empty");
      message.error("Products not loaded. Please refresh the page.");
      return;
    }

    // Find product
    const product = products.find((p) => p.id === values.productId);
    console.log("🔵 [Invoice] Found product:", product ? product.productName : "NOT FOUND");
    
    if (!product) {
      console.error("❌ [Invoice] Product not found for ID:", values.productId);
      message.error("Product not found");
      return;
    }

    const quantity = values.quantity || 1;
    const unitPrice = values.unitPrice || product.salesPrice || 0;
    const discountPercent = values.discountPercent || 0;
    const taxPercent = values.taxPercent || 0;
    const lineTotal = calculateItemTotal(quantity, unitPrice, discountPercent, taxPercent);

    console.log("🔵 [Invoice] Item details:", {
      productId: values.productId,
      productName: product.productName,
      quantity,
      unitPrice,
      discountPercent,
      taxPercent,
      lineTotal,
    });

    if (editingItemId) {
      // Update existing item
      console.log("🔵 [Invoice] Updating existing item:", editingItemId);
      const updatedItems = billItems.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              productId: values.productId,
              product,
              quantity,
              unitPrice,
              discountPercent,
              taxPercent,
              lineTotal,
            }
          : item
      );
      setBillItems(updatedItems);
      setEditingItemId(null);
      console.log("✅ [Invoice] Item updated. New billItems count:", updatedItems.length);
      message.success("Item updated");
    } else {
      // Add new item
      console.log("🔵 [Invoice] Adding new item");
      const newItem = {
        id: Date.now().toString(),
        productId: values.productId,
        product,
        quantity,
        unitPrice,
        discountPercent,
        taxPercent,
        lineTotal,
      };
      const updatedItems = [...billItems, newItem];
      setBillItems(updatedItems);
      console.log("✅ [Invoice] Item added. New billItems count:", updatedItems.length);
      message.success("Item added");
    }
    itemForm.resetFields();
  };

  // Handle edit item
  const handleEditItem = (item) => {
    console.log("🔵 [Invoice] handleEditItem called for item:", item);
    setEditingItemId(item.id);
    const formValues = {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent || 0,
      taxPercent: item.taxPercent || 0,
    };
    console.log("🔵 [Invoice] Setting form values:", formValues);
    itemForm.setFieldsValue(formValues);
    const formElement = document.querySelector('.ant-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    console.log("✅ [Invoice] Form values set for editing");
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingItemId(null);
    itemForm.resetFields();
  };

  // Remove item from bill
  const handleRemoveItem = (itemId) => {
    setBillItems(billItems.filter((item) => item.id !== itemId));
    message.success("Item removed");
  };

  // Handle form submit
  const handleSubmit = async (values) => {
    console.log("🔵 [Invoice] handleSubmit called");
    console.log("🔵 [Invoice] Bill items count:", billItems.length);
    console.log("🔵 [Invoice] Form values:", values);
    
    if (billItems.length === 0) {
      message.error("Please add at least one item");
      return;
    }

    // Validate that at least one of customer or branch is selected
    if (!values.customerId && !values.branchId) {
      message.error("Please select either a customer or a branch");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: formType, // Use formType instead of values.type
        customerId: values.customerId || null,
        branchId: values.branchId || null,
        items: billItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          taxPercent: item.taxPercent || 0,
        })),
        remarks: values.remarks || "",
      };

      console.log("🔵 [Invoice] Submitting payload:", payload);
      console.log("🔵 [Invoice] Editing ID:", editingId);

      if (editingId) {
        console.log("🔵 [Invoice] Updating invoice:", editingId);
        const res = await api.put(`/api/bill/${editingId}`, payload);
        console.log("✅ [Invoice] Update response:", res.data);
        
        if (res.data && res.data.success) {
          message.success("Invoice updated successfully");
          setShowForm(false);
          setEditingId(null);
          setEditingItemId(null);
          setBillItems([]);
          form.resetFields();
          itemForm.resetFields();
          await fetchBills(pagination.current, pagination.pageSize);
        } else {
          const errorMessage = res.data?.message || "Failed to update invoice";
          console.error("❌ [Invoice] Update failed:", errorMessage);
          message.error(errorMessage);
        }
      } else {
        console.log("🔵 [Invoice] Creating new invoice");
        const res = await api.post("/api/bill", payload);
        console.log("✅ [Invoice] Create response:", res.data);
        console.log("✅ [Invoice] Response success flag:", res.data?.success);
        
        if (res.data && res.data.success) {
          message.success("Invoice created successfully");
          setShowForm(false);
          setEditingId(null);
          setEditingItemId(null);
          setBillItems([]);
          form.resetFields();
          itemForm.resetFields();
          await fetchBills(pagination.current, pagination.pageSize);
        } else {
          const errorMessage = res.data?.message || "Failed to create invoice";
          console.error("❌ [Invoice] Create failed:", errorMessage);
          message.error(errorMessage);
        }
      }
    } catch (err) {
      console.error("❌ [Invoice] Error saving invoice:", err);
      console.error("❌ [Invoice] Error response:", err?.response);
      console.error("❌ [Invoice] Error response data:", err?.response?.data);
      console.error("❌ [Invoice] Error response status:", err?.response?.status);
      
      const errorData = err?.response?.data;
      let errorMessage = "Error saving invoice";
      
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
    } finally {
      setLoading(false);
    }
  };

  // Handle create invoice
  const handleCreateInvoice = () => {
    setFormType("invoice");
    setEditingId(null);
    setShowForm(true);
    setBillItems([]);
    form.resetFields();
    itemForm.resetFields();
  };

  // Note: Invoices cannot be edited, only quotations can be edited

  // Handle add payment
  const handleAddPayment = async (values) => {
    try {
      setLoading(true);
      const payload = {
        paymentMode: values.paymentMode,
        amountPaid: values.amountPaid,
        transactionId: values.transactionId || null,
      };

      const res = await api.post(`/api/bill/${selectedBill.id}/payment`, payload);
      
      if (res.data && res.data.success) {
        message.success("Payment added successfully");
        setShowPaymentModal(false);
        paymentForm.resetFields();
        setSelectedBill(null);
        await fetchBills(pagination.current, pagination.pageSize);
      } else {
        const errorMsg = res.data?.message || "Failed to add payment";
        message.error(errorMsg);
      }
    } catch (err) {
      console.error("Error adding payment", err);
      console.error("Error response:", err?.response?.data);
      const errorData = err?.response?.data;
      let errorMsg = "Error adding payment";
      
      if (errorData) {
        if (errorData.message) {
          errorMsg = errorData.message;
        } else if (errorData.error) {
          errorMsg = errorData.error;
        } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMsg = errorData.errors.map(e => {
            const field = e.field || e.path || "unknown";
            const msg = e.message || "Validation error";
            return `${field}: ${msg}`;
          }).join(", ");
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle view bill
  const handleViewBill = async (record) => {
    try {
      const res = await api.get(`/api/bill/${record.id}`);
      const bill = res.data.data || record;
      setSelectedBill(bill);
      setShowViewModal(true);
    } catch (err) {
      message.error("Error loading bill details");
    }
  };

  // Handle edit invoice
  const handleEdit = async (record) => {
    try {
      setEditingItemId(null);
      const res = await api.get(`/api/bill/${record.id}`);
      const invoice = res.data.data || record;

      setEditingId(invoice.id);
      setShowForm(true);

      const items = (invoice.items || []).map((item) => ({
        id: item.id || Date.now().toString(),
        productId: item.productId,
        product: item.product || products.find((p) => p.id === item.productId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent || 0,
        lineTotal: item.lineTotal || 0,
      }));
      setBillItems(items);

      form.setFieldsValue({
        customerId: invoice.customerId,
        branchId: invoice.branchId || null,
        remarks: invoice.remarks,
      });
    } catch (err) {
      message.error("Error loading invoice details");
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/bill/${id}/hard`);
      message.success("Deleted successfully");
      fetchBills(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Error deleting");
    }
  };

  // Calculate total paid for a bill
  const getTotalPaid = (bill) => {
    if (!bill || !bill.payments || !Array.isArray(bill.payments)) return 0;
    return bill.payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
  };

  // Calculate due amount
  const getDueAmount = (bill) => {
    if (!bill) return 0;
    const totalPaid = getTotalPaid(bill);
    return (bill.grandTotal || 0) - totalPaid;
  };

  // Filter invoices (already filtered to show only invoices)
  const filteredBills = bills.filter((bill) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const billNoMatch = bill.billNo?.toLowerCase().includes(searchLower);
      const customerMatch = bill.customer?.customer_name?.toLowerCase().includes(searchLower);
      if (!billNoMatch && !customerMatch) return false;
    }

    // Filter by customer
    if (customerFilter && bill.customerId !== customerFilter) return false;

    return true;
  });

  // PDF Export
  const exportToPDF = async () => {
    try {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoices Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
              .total { font-size: 18px; font-weight: bold; color: #1890ff; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoices Report</h1>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
              <p>Total Records: ${filteredBills.length}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Grand Total</th>
                  <th>Payment Status</th>
                  <th>Due Amount</th>
                </tr>
              </thead>
              <tbody>
                ${filteredBills.map((bill) => `
                  <tr>
                    <td>${bill.billNo || "-"}</td>
                    <td>${bill.customer?.customer_name || "-"}</td>
                    <td>${bill.branch?.branchName || "-"}</td>
                    <td>${bill.billDate ? dayjs(bill.billDate).format("DD/MM/YYYY") : "-"}</td>
                    <td>₹${(bill.grandTotal || 0).toFixed(2)}</td>
                    <td>${bill.paymentStatus || "unpaid"}</td>
                    <td>₹${getDueAmount(bill).toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            
            <div class="summary">
              <div class="total">Total Invoices: ${filteredBills.length}</div>
              <p><strong>Total Amount:</strong> ₹${filteredBills.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0).toFixed(2)}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      console.error("Error exporting PDF", err);
      message.error("Error exporting PDF");
    }
  };

  const totals = calculateTotals();

  // Table columns
  const columns = [
          {
      title: "Invoice No",
      dataIndex: "billNo",
      key: "billNo",
      width: 120,
    },
    {
      title: "Customer",
      dataIndex: ["customer", "customer_name"],
      key: "customer",
      width: 200,
      render: (name) => capitalizeTableText(name, "customer_name") || "-",
    },
    {
      title: "Branch",
      dataIndex: ["branch", "branchName"],
      key: "branch",
      width: 150,
      render: (_, record) => capitalizeTableText(record.branch?.branchName, "branchName") || "-",
    },
    {
      title: "Date",
      dataIndex: "billDate",
      key: "billDate",
      width: 120,
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Grand Total",
      dataIndex: "grandTotal",
      key: "grandTotal",
      width: 120,
      align: "right",
      render: (amount) => `₹${(amount || 0).toFixed(2)}`,
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 120,
      render: (status, record) => {
        if (record.type === "quotation") {
          return <Tag color="default">N/A</Tag>;
        }
        const statusMap = {
          unpaid: { color: "red", text: "Unpaid" },
          partial: { color: "orange", text: "Partial" },
          paid: { color: "green", text: "Paid" },
        };
        const config = statusMap[status] || { color: "default", text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Due Amount",
      key: "dueAmount",
      width: 120,
      align: "right",
      render: (_, record) => {
        if (!record || record.type === "quotation") return "-";
        const due = getDueAmount(record);
        return <Text type={due > 0 ? "danger" : "success"}>₹{due.toFixed(2)}</Text>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleViewBill(record)}
            title="View"
          />
          {canEdit() && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                title="Edit"
              />
              <Button
                icon={<DollarOutlined />}
                onClick={() => {
                  setSelectedBill(record);
                  setShowPaymentModal(true);
                }}
                title="Add Payment"
              />
            </>
          )}
          {canDelete() && (
            <Popconfirm
              title="Are you sure you want to delete this?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Items table columns
  const itemColumns = [
    {
      title: "Product",
      dataIndex: "product",
      key: "product",
      render: (product) => product?.productName || product?.name || "-",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
    },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right",
      render: (price) => `₹${(price || 0).toFixed(2)}`,
    },
    {
      title: "Discount %",
      dataIndex: "discountPercent",
      key: "discountPercent",
      width: 100,
      align: "right",
      render: (discount) => `${(discount || 0).toFixed(2)}%`,
    },
    {
      title: "Tax %",
      dataIndex: "taxPercent",
      key: "taxPercent",
      width: 100,
      align: "right",
      render: (tax) => `${(tax || 0).toFixed(2)}%`,
    },
    {
      title: "Line Total",
      dataIndex: "lineTotal",
      key: "lineTotal",
      width: 120,
      align: "right",
      render: (total) => `₹${(total || 0).toFixed(2)}`,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditItem(record)}
          >
            Edit
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (editingItemId === record.id) {
                setEditingItemId(null);
                itemForm.resetFields();
              }
              handleRemoveItem(record.id);
            }}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice Management</h1>
        <Space>
          <Button
            icon={<FilePdfOutlined />}
            onClick={exportToPDF}
            type="primary"
            danger
          >
            Export PDF
          </Button>
          {canCreate() && (
            <Button
              icon={<MoneyCollectOutlined />}
              onClick={handleCreateInvoice}
              type="primary"
            >
              Create Invoice
            </Button>
          )}
        </Space>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Search by invoice number or customer name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Select
          placeholder="Filter by Customer"
          allowClear
          value={customerFilter}
          onChange={(value) => setCustomerFilter(value)}
          style={{ width: 200 }}
        >
          {customers.map((customer) => (
            <Select.Option key={customer.id} value={customer.id}>
              {customer.customer_name}
            </Select.Option>
          ))}
        </Select>
        <Button
          onClick={() => {
            setSearchTerm('');
            setCustomerFilter(null);
          }}
          disabled={!searchTerm && !customerFilter}
        >
          Clear Filters
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6" title={editingId ? "Edit Invoice" : "Create Invoice"}>
          <Form layout="vertical" form={form} onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="customerId"
                  label="Customer"
                >
                  <Select placeholder="Select customer (optional)" showSearch optionFilterProp="children" allowClear>
                    {customers.map((customer) => (
                      <Select.Option key={customer.id} value={customer.id}>
                        {customer.customer_name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="branchId"
                  label="Branch"
                >
                  <Select placeholder="Select branch (optional)" showSearch optionFilterProp="children" allowClear>
                    {branches.map((branch) => (
                      <Select.Option key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.customerId !== currentValues.customerId || prevValues.branchId !== currentValues.branchId}>
                  {({ getFieldValue }) => {
                    const customerId = getFieldValue('customerId');
                    const branchId = getFieldValue('branchId');
                    if (!customerId && !branchId) {
                      return (
                        <div style={{ color: '#ff4d4f', fontSize: '14px', marginTop: '-16px', marginBottom: '16px' }}>
                          Please select either a customer or a branch
                        </div>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="remarks" label="Remarks">
                  <TextArea rows={2} placeholder="Enter remarks" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Items</Divider>

            {/* Item Form */}
            <Card size="small" style={{ marginBottom: 16 }} title={editingItemId ? "Edit Item" : "Add Item"}>
              <Form 
                form={itemForm} 
                onFinish={handleAddItem}
                onFinishFailed={(errorInfo) => {
                  console.error('❌ [Invoice] Item form validation failed:', errorInfo);
                  message.error("Please fill in all required fields");
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item
                      name="productId"
                      label="Product"
                      rules={[{ required: true, message: "Select product" }]}
                    >
                      <Select
                        placeholder="Select product"
                        showSearch
                        optionFilterProp="children"
                        onChange={(productId) => {
                          const selectedProduct = products.find((p) => p.id === productId);
                          if (selectedProduct) {
                            const unitPrice = selectedProduct.salesPrice || selectedProduct.purchasePrice || 0;
                            const discountPercent = selectedProduct.discountPercent || 0;
                            const taxPercent = selectedProduct.hasGST && selectedProduct.gstPercent 
                              ? selectedProduct.gstPercent 
                              : 0;
                            itemForm.setFieldsValue({
                              unitPrice: unitPrice,
                              discountPercent: discountPercent,
                              taxPercent: taxPercent,
                            });
                          }
                        }}
                      >
                        {products.map((product) => (
                          <Select.Option key={product.id} value={product.id}>
                            {product.productName} ({product.unit?.unitName || 'No Unit'})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={4}>
                    <Form.Item
                      name="quantity"
                      label="Quantity"
                      rules={[{ required: true, message: "Enter quantity" }]}
                    >
                      <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={4}>
                    <Form.Item 
                      name="unitPrice" 
                      label="Unit Price"
                      rules={[{ required: true, message: "Enter unit price" }]}
                    >
                      <InputNumber min={0} step={0.01} style={{ width: "100%" }} prefix="₹" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={4}>
                    <Form.Item name="discountPercent" label="Discount %">
                      <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={4}>
                    <Form.Item name="taxPercent" label="Tax %">
                      <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item>
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const values = await itemForm.validateFields();
                          handleAddItem(values);
                        } catch (errorInfo) {
                          console.error('❌ [Invoice] Item form validation failed:', errorInfo);
                          message.error("Please fill in all required fields");
                        }
                      }}
                      icon={editingItemId ? <EditOutlined /> : <PlusOutlined />}
                    >
                      {editingItemId ? "Update Item" : "Add Item"}
                    </Button>
                    {editingItemId && (
                      <Button onClick={handleCancelEdit}>Cancel</Button>
                    )}
                  </Space>
                </Form.Item>
              </Form>
            </Card>

            {/* Items Table */}
            <Table
              columns={itemColumns}
              dataSource={billItems}
              rowKey="id"
              pagination={false}
              size="small"
              style={{ marginBottom: 16 }}
            />

            {/* Totals */}
            <Row gutter={16} justify="end">
              <Col span={8}>
                <Card size="small">
                  <Row justify="space-between">
                    <Col>Subtotal:</Col>
                    <Col>₹{totals.subtotal.toFixed(2)}</Col>
                  </Row>
                  <Row justify="space-between">
                    <Col>Discount:</Col>
                    <Col>₹{totals.totalDiscount.toFixed(2)}</Col>
                  </Row>
                  <Row justify="space-between">
                    <Col>Tax:</Col>
                    <Col>₹{totals.totalTax.toFixed(2)}</Col>
                  </Row>
                  <Divider style={{ margin: "8px 0" }} />
                  <Row justify="space-between">
                    <Col><strong>Grand Total:</strong></Col>
                    <Col><strong>₹{totals.grandTotal.toFixed(2)}</strong></Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingId ? "Update Invoice" : "Create Invoice"}
                </Button>
                <Button onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setBillItems([]);
                  form.resetFields();
                  itemForm.resetFields();
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
        dataSource={filteredBills}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      {/* View Modal */}
      <Modal
        title="Invoice Details"
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedBill(null);
        }}
        footer={null}
        width={800}
      >
        {selectedBill && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Invoice No:</Text> {selectedBill.billNo}
              </Col>
              <Col span={12}>
                <Text strong>Date:</Text> {selectedBill.billDate ? dayjs(selectedBill.billDate).format("DD/MM/YYYY") : "-"}
              </Col>
              <Col span={12} style={{ marginTop: 8 }}>
                <Text strong>Customer:</Text> {selectedBill.customer?.customer_name || "-"}
              </Col>
              <Col span={12} style={{ marginTop: 8 }}>
                <Text strong>Branch:</Text> {selectedBill.branch?.branchName || "-"}
              </Col>
            </Row>
            <Divider />
            <Table
              columns={itemColumns.filter(col => col.key !== "actions")}
              dataSource={selectedBill.items || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
            <Divider />
            <Row justify="end">
              <Col span={8}>
                <Card size="small">
                  <Row justify="space-between">
                    <Col>Subtotal:</Col>
                    <Col>₹{((selectedBill.totalAmount || 0) + (selectedBill.discountAmount || 0)).toFixed(2)}</Col>
                  </Row>
                  <Row justify="space-between">
                    <Col>Discount:</Col>
                    <Col>₹{(selectedBill.discountAmount || 0).toFixed(2)}</Col>
                  </Row>
                  <Row justify="space-between">
                    <Col>Tax:</Col>
                    <Col>₹{(selectedBill.taxAmount || 0).toFixed(2)}</Col>
                  </Row>
                  <Divider style={{ margin: "8px 0" }} />
                  <Row justify="space-between">
                    <Col><strong>Grand Total:</strong></Col>
                    <Col><strong>₹{(selectedBill.grandTotal || 0).toFixed(2)}</strong></Col>
                  </Row>
                  {selectedBill.type === "invoice" && (
                    <>
                      <Divider style={{ margin: "8px 0" }} />
                      <Row justify="space-between">
                        <Col>Total Paid:</Col>
                        <Col>₹{getTotalPaid(selectedBill).toFixed(2)}</Col>
                      </Row>
                      <Row justify="space-between">
                        <Col><strong>Due Amount:</strong></Col>
                        <Col><Text type={getDueAmount(selectedBill) > 0 ? "danger" : "success"}>
                          <strong>₹{getDueAmount(selectedBill).toFixed(2)}</strong>
                        </Text></Col>
                      </Row>
                    </>
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        title="Add Payment"
        open={showPaymentModal}
        onCancel={() => {
          setShowPaymentModal(false);
          setSelectedBill(null);
          paymentForm.resetFields();
        }}
        onOk={() => paymentForm.submit()}
        okText="Add Payment"
      >
        <Form form={paymentForm} onFinish={handleAddPayment} layout="vertical">
          <Form.Item
            name="paymentMode"
            label="Payment Mode"
            rules={[{ required: true, message: "Please select payment mode" }]}
          >
            <Select placeholder="Select payment mode">
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="card">Card</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="upi">UPI</Select.Option>
              <Select.Option value="cheque">Cheque</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="amountPaid"
            label="Amount Paid"
            rules={[{ required: true, message: "Please enter amount" }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: "100%" }}
              placeholder="Enter amount"
            />
          </Form.Item>
          <Form.Item name="transactionId" label="Transaction ID">
            <Input placeholder="Enter transaction ID (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
