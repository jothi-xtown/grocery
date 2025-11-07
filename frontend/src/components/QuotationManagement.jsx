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
  SwapOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { canEdit, canDelete, canCreate } from "../service/auth";
import { capitalizeTableText } from "../utils/textUtils";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

const QuotationManagement = () => {
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
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
    fetchQuotations();
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
      console.log("🔵 [Quotation] Fetching products...");
      const res = await api.get("/api/products?limit=1000");
      console.log("🔵 [Quotation] Products API Response:", res.data);
      
      if (res.data && res.data.success) {
        const productsData = res.data.data || [];
        console.log(`✅ [Quotation] Products fetched successfully: ${productsData.length} products`);
        setProducts(productsData);
      } else {
        console.error("❌ [Quotation] Invalid response format:", res.data);
        message.error("Failed to fetch products: Invalid response format");
        setProducts([]);
      }
    } catch (err) {
      console.error("❌ [Quotation] Error fetching products:", err);
      console.error("❌ [Quotation] Error response:", err?.response);
      const errorMessage = err?.response?.data?.message 
        || err?.response?.data?.error 
        || err?.message 
        || "Failed to fetch products";
      message.error(errorMessage);
      setProducts([]);
    }
  };

  // Fetch quotations only
  const fetchQuotations = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const url = `/api/bill?page=${page}&limit=${limit}`;
      const res = await api.get(url);
      const allBills = res.data.data || [];
      // Filter to show only quotations
      const quotationsData = allBills.filter((bill) => bill.type === "quotation");

      setQuotations(quotationsData);
      setPagination((prev) => ({
        ...prev,
        current: res.data.page || page,
        total: quotationsData.length,
        pageSize: res.data.limit || limit,
      }));
    } catch (err) {
      console.error("Error fetching quotations", err);
      message.error("Error fetching quotations");
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchQuotations(pagination.current, pagination.pageSize);
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
    console.log("🔵 [Quotation] handleAddItem called with values:", values);
    console.log("🔵 [Quotation] Current products count:", products.length);
    console.log("🔵 [Quotation] Current billItems count:", billItems.length);
    console.log("🔵 [Quotation] Editing item ID:", editingItemId);
    
    // Validate products array
    if (!products || products.length === 0) {
      console.error("❌ [Quotation] Products array is empty");
      message.error("Products not loaded. Please refresh the page.");
      return;
    }

    // Find product
    const product = products.find((p) => p.id === values.productId);
    console.log("🔵 [Quotation] Found product:", product ? product.productName : "NOT FOUND");
    
    if (!product) {
      console.error("❌ [Quotation] Product not found for ID:", values.productId);
      message.error("Product not found");
      return;
    }

    const quantity = values.quantity || 1;
    const unitPrice = values.unitPrice || product.salesPrice || 0;
    const discountPercent = values.discountPercent || 0;
    const taxPercent = values.taxPercent || 0;
    const lineTotal = calculateItemTotal(quantity, unitPrice, discountPercent, taxPercent);

    console.log("🔵 [Quotation] Item details:", {
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
      console.log("🔵 [Quotation] Updating existing item:", editingItemId);
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
      console.log("✅ [Quotation] Item updated. New billItems count:", updatedItems.length);
      message.success("Item updated");
    } else {
      // Add new item
      console.log("🔵 [Quotation] Adding new item");
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
      console.log("✅ [Quotation] Item added. New billItems count:", updatedItems.length);
      message.success("Item added");
    }
    itemForm.resetFields();
  };

  // Handle edit item
  const handleEditItem = (item) => {
    console.log("🔵 [Quotation] handleEditItem called for item:", item);
    setEditingItemId(item.id);
    const formValues = {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent || 0,
      taxPercent: item.taxPercent || 0,
    };
    console.log("🔵 [Quotation] Setting form values:", formValues);
    itemForm.setFieldsValue(formValues);
    console.log("✅ [Quotation] Form values set for editing");
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
    console.log("🔵 [Quotation] handleSubmit called");
    console.log("🔵 [Quotation] Bill items count:", billItems.length);
    console.log("🔵 [Quotation] Form values:", values);
    
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
        type: "quotation", // Always quotation
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

      console.log("🔵 [Quotation] Submitting payload:", payload);
      console.log("🔵 [Quotation] Editing ID:", editingId);

      if (editingId) {
        console.log("🔵 [Quotation] Updating quotation:", editingId);
        const res = await api.put(`/api/bill/${editingId}`, payload);
        console.log("✅ [Quotation] Update response:", res.data);
        
        if (res.data && res.data.success) {
          message.success("Quotation updated successfully");
          setShowForm(false);
          setEditingId(null);
          setEditingItemId(null);
          setBillItems([]);
          form.resetFields();
          itemForm.resetFields();
          await fetchQuotations(pagination.current, pagination.pageSize);
        } else {
          const errorMessage = res.data?.message || "Failed to update quotation";
          console.error("❌ [Quotation] Update failed:", errorMessage);
          message.error(errorMessage);
        }
      } else {
        console.log("🔵 [Quotation] Creating new quotation");
        const res = await api.post("/api/bill", payload);
        console.log("✅ [Quotation] Create response:", res.data);
        console.log("✅ [Quotation] Response success flag:", res.data?.success);
        
        if (res.data && res.data.success) {
          message.success("Quotation created successfully");
          setShowForm(false);
          setEditingId(null);
          setEditingItemId(null);
          setBillItems([]);
          form.resetFields();
          itemForm.resetFields();
          await fetchQuotations(pagination.current, pagination.pageSize);
        } else {
          const errorMessage = res.data?.message || "Failed to create quotation";
          console.error("❌ [Quotation] Create failed:", errorMessage);
          message.error(errorMessage);
        }
      }
    } catch (err) {
      console.error("❌ [Quotation] Error saving quotation:", err);
      console.error("❌ [Quotation] Error response:", err?.response);
      console.error("❌ [Quotation] Error response data:", err?.response?.data);
      console.error("❌ [Quotation] Error response status:", err?.response?.status);
      
      const errorData = err?.response?.data;
      let errorMessage = "Error saving quotation";
      
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

  // Handle create quotation
  const handleCreateQuotation = () => {
    setEditingId(null);
    setShowForm(true);
    setBillItems([]);
    form.resetFields();
    itemForm.resetFields();
  };

  // Handle edit
  const handleEdit = async (record) => {
    try {
      setEditingItemId(null);
      const res = await api.get(`/api/bill/${record.id}`);
      const quotation = res.data.data || record;

      setEditingId(quotation.id);
      setShowForm(true);

      const items = (quotation.items || []).map((item) => ({
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
        customerId: quotation.customerId,
        branchId: quotation.branchId || null,
        remarks: quotation.remarks,
      });
    } catch (err) {
      message.error("Error loading quotation details");
    }
  };

  // Handle convert to invoice
  const handleConvertToInvoice = async (quotationId) => {
    try {
      setLoading(true);
      await api.post(`/api/bill/${quotationId}/convert`);
      message.success("Quotation converted to invoice successfully");
      fetchQuotations(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error converting to invoice", err);
      const errorMsg = err?.response?.data?.message || "Error converting to invoice";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle view quotation
  const handleViewQuotation = async (record) => {
    try {
      const res = await api.get(`/api/bill/${record.id}`);
      const quotation = res.data.data || record;
      setSelectedQuotation(quotation);
      setShowViewModal(true);
    } catch (err) {
      message.error("Error loading quotation details");
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/bill/${id}/hard`);
      message.success("Quotation deleted successfully");
      fetchQuotations(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Error deleting quotation");
    }
  };

  // Filter quotations
  const filteredQuotations = quotations.filter((quotation) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const billNoMatch = quotation.billNo?.toLowerCase().includes(searchLower);
      const customerMatch = quotation.customer?.customer_name?.toLowerCase().includes(searchLower);
      if (!billNoMatch && !customerMatch) return false;
    }

    // Filter by customer
    if (customerFilter && quotation.customerId !== customerFilter) return false;

    return true;
  });

  const totals = calculateTotals();

  // Table columns
  const columns = [
    {
      title: "Quotation No",
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
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleViewQuotation(record)}
            title="View"
          />
          {canEdit() && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                title="Edit"
              />
              <Popconfirm
                title="Convert this quotation to invoice?"
                description="This will deduct stock and cannot be undone."
                onConfirm={() => handleConvertToInvoice(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<SwapOutlined />} title="Convert to Invoice" />
              </Popconfirm>
            </>
          )}
          {canDelete() && (
            <Popconfirm
              title="Are you sure you want to delete this quotation?"
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
        <h1 className="text-2xl font-bold">Quotation Management</h1>
        <Space>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => {
              const printWindow = window.open("", "_blank");
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Quotations Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 20px; }
                      table { width: 100%; border-collapse: collapse; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f2f2f2; }
                    </style>
                  </head>
                  <body>
                    <h1>Quotations Report</h1>
                    <table>
                      <thead>
                        <tr>
                          <th>Quotation No</th>
                          <th>Customer</th>
                          <th>Branch</th>
                          <th>Date</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filteredQuotations.map((quotation) => `
                          <tr>
                            <td>${quotation.billNo || "-"}</td>
                            <td>${quotation.customer?.customer_name || "-"}</td>
                            <td>${quotation.branch?.branchName || "-"}</td>
                            <td>${quotation.billDate ? dayjs(quotation.billDate).format("DD/MM/YYYY") : "-"}</td>
                            <td>₹${(quotation.grandTotal || 0).toFixed(2)}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }}
            type="primary"
            danger
          >
            Export PDF
          </Button>
          {canCreate() && (
            <Button
              icon={<FileTextOutlined />}
              onClick={handleCreateQuotation}
              type="primary"
            >
              Create Quotation
            </Button>
          )}
        </Space>
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Search by quotation number or customer name"
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
        <Card className="mb-6" title={editingId ? "Edit Quotation" : "Create Quotation"}>
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
                  console.error('❌ [Quotation] Item form validation failed:', errorInfo);
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
                          console.error('❌ [Quotation] Item form validation failed:', errorInfo);
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
                  {editingId ? "Update Quotation" : "Create Quotation"}
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
        dataSource={filteredQuotations}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} quotations`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      {/* View Modal */}
      <Modal
        title="Quotation Details"
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedQuotation(null);
        }}
        footer={null}
        width={800}
      >
        {selectedQuotation && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Quotation No:</Text> {selectedQuotation.billNo}
              </Col>
              <Col span={12}>
                <Text strong>Date:</Text> {selectedQuotation.billDate ? dayjs(selectedQuotation.billDate).format("DD/MM/YYYY") : "-"}
              </Col>
              <Col span={12} style={{ marginTop: 8 }}>
                <Text strong>Customer:</Text> {selectedQuotation.customer?.customer_name || "-"}
              </Col>
              <Col span={12} style={{ marginTop: 8 }}>
                <Text strong>Branch:</Text> {selectedQuotation.branch?.branchName || "-"}
              </Col>
            </Row>
            <Divider />
            <Table
              columns={itemColumns.filter(col => col.key !== "actions")}
              dataSource={selectedQuotation.items || []}
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
                    <Col>₹{((selectedQuotation.totalAmount || 0) + (selectedQuotation.discountAmount || 0)).toFixed(2)}</Col>
                  </Row>
                  <Row justify="space-between">
                    <Col>Discount:</Col>
                    <Col>₹{(selectedQuotation.discountAmount || 0).toFixed(2)}</Col>
                  </Row>
                  <Row justify="space-between">
                    <Col>Tax:</Col>
                    <Col>₹{(selectedQuotation.taxAmount || 0).toFixed(2)}</Col>
                  </Row>
                  <Divider style={{ margin: "8px 0" }} />
                  <Row justify="space-between">
                    <Col><strong>Grand Total:</strong></Col>
                    <Col><strong>₹{(selectedQuotation.grandTotal || 0).toFixed(2)}</strong></Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuotationManagement;

