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
  SwapOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { canEdit, canDelete, canCreate } from "../service/auth";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

const BillManagement = () => {
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
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

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await api.get("/api/products?limit=1000");
      setProducts(res.data.data || []);
    } catch (err) {
      console.error("Error fetching products", err);
    }
  };

  // Fetch bills - only invoices
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
    const totalAmount = billItems.reduce((sum, item) => {
      return sum + calculateItemTotal(
        item.quantity || 0,
        item.unitPrice || 0,
        item.discountPercent || 0,
        item.taxPercent || 0
      );
    }, 0);
    return { totalAmount, grandTotal: totalAmount };
  };

  // Add or update item in bill
  const handleAddItem = async (values) => {
    try {
      const product = products.find((p) => p.id === values.productId);
      if (!product) {
        message.error("Product not found");
        return;
      }

      const itemData = {
        productId: values.productId,
        product: product,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        discountPercent: values.discountPercent || 0,
        taxPercent: values.taxPercent || 0,
        lineTotal: calculateItemTotal(
          values.quantity,
          values.unitPrice,
          values.discountPercent || 0,
          values.taxPercent || 0
        ),
      };

      if (editingItemId) {
        // Update existing item
        setBillItems(billItems.map(item => 
          item.id === editingItemId ? { ...itemData, id: editingItemId } : item
        ));
        setEditingItemId(null);
        message.success("Item updated successfully");
      } else {
        // Add new item
        const newItem = {
          ...itemData,
          id: Date.now().toString(),
        };
        setBillItems([...billItems, newItem]);
        message.success("Item added to bill");
      }

      itemForm.resetFields();
    } catch (err) {
      message.error("Error adding item");
    }
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    itemForm.setFieldsValue({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent || 0,
      taxPercent: item.taxPercent || 0,
    });
    // Scroll to form if needed
    const formElement = document.querySelector('.ant-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    if (billItems.length === 0) {
      message.error("Please add at least one item");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: values.type || "quotation",
        customerId: values.customerId,
        items: billItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          taxPercent: item.taxPercent || 0,
        })),
        remarks: values.remarks || "",
      };

      if (editingId) {
        await api.put(`/api/bill/${editingId}`, payload);
        message.success("Bill updated successfully");
      } else {
        await api.post("/api/bill", payload);
        message.success("Bill created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      setEditingItemId(null);
      setBillItems([]);
      form.resetFields();
      itemForm.resetFields();
      fetchBills(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error saving bill", err);
      const errorMsg = err?.response?.data?.message || "Error saving bill";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = async (record) => {
    try {
      setEditingItemId(null); // Reset item editing when editing bill
      const res = await api.get(`/api/bill/${record.id}`);
      const bill = res.data.data || record;

      if (bill.type === "invoice") {
        message.warning("Invoices cannot be edited. Only quotations can be edited.");
        return;
      }

      setEditingId(bill.id);
      setShowForm(true);

      // Set bill items
      const items = (bill.items || []).map((item) => ({
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
        type: bill.type,
        customerId: bill.customerId,
        remarks: bill.remarks,
      });
    } catch (err) {
      message.error("Error loading bill details");
    }
  };

  // Handle convert to invoice
  const handleConvertToInvoice = async (billId) => {
    try {
      setLoading(true);
      await api.post(`/api/bill/${billId}/convert`);
      message.success("Quotation converted to invoice successfully");
      fetchBills(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error converting to invoice", err);
      const errorMsg = err?.response?.data?.message || "Error converting to invoice";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle add payment
  const handleAddPayment = async (values) => {
    try {
      setLoading(true);
      const payload = {
        billId: selectedBill.id,
        paymentMode: values.paymentMode,
        amountPaid: values.amountPaid,
        transactionId: values.transactionId || "",
      };

      await api.post(`/api/bill/${selectedBill.id}/payment`, payload);
      message.success("Payment added successfully");
      setShowPaymentModal(false);
      paymentForm.resetFields();
      setSelectedBill(null);
      fetchBills(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error adding payment", err);
      const errorMsg = err?.response?.data?.message || "Error adding payment";
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

  // PDF Export - Only invoices
  const exportToPDF = async () => {
    try {
      // Fetch all bills with high limit
      const res = await api.get("/api/bill?page=1&limit=1000");
      const allBills = res.data.data || [];

      // Filter to only invoices
      let filteredBills = allBills.filter((bill) => bill.type === "invoice");

      // Filter by search term
      if (searchTerm) {
        filteredBills = filteredBills.filter(
          (bill) =>
            bill.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.customer?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by customer
      if (customerFilter) {
        filteredBills = filteredBills.filter((bill) => bill.customerId === customerFilter);
      }

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
                <th>Date</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Grand Total</th>
                <th>Payment Status</th>
                <th>Due Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills.map((bill) => `
                <tr>
                  <td>${bill.billNo || "-"}</td>
                  <td>${bill.billDate ? dayjs(bill.billDate).format("DD/MM/YYYY") : "-"}</td>
                  <td>${bill.customer?.customer_name || "-"}</td>
                  <td>${bill.branch?.branchName || "-"}</td>
                  <td>₹${(bill.grandTotal || 0).toFixed(2)}</td>
                  <td>${bill.paymentStatus || "unpaid"}</td>
                  <td>₹${(getDueAmount(bill)).toFixed(2)}</td>
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

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/bill/${id}/hard`);
      message.success("Bill deleted successfully");
      fetchBills(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Error deleting bill");
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

  // Filter bills - only invoices
  const filteredBills = bills.filter((bill) => {
    // Only show invoices
    if (bill.type !== "invoice") return false;

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

  // Table columns
  const columns = [
    {
      title: "Bill No",
      dataIndex: "billNo",
      key: "billNo",
      width: 120,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type) => {
        const typeMap = {
          quotation: { color: "blue", text: "Quotation" },
          invoice: { color: "green", text: "Invoice" },
        };
        const config = typeMap[type] || { color: "default", text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Customer",
      dataIndex: ["customer", "customer_name"],
      key: "customer",
      width: 200,
    },
    {
      title: "Branch",
      dataIndex: ["branch", "branchName"],
      key: "branch",
      width: 150,
      render: (_, record) => record.branch?.branchName || "-",
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
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewBill(record)}
            title="View"
          />
          {canEdit() && (
            <Button
              type="link"
              icon={<DollarOutlined />}
              onClick={() => {
                setSelectedBill(record);
                setShowPaymentModal(true);
              }}
              title="Payment"
            />
          )}
          {canDelete() && (
            <Popconfirm
              title="Are you sure you want to delete this invoice?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger size="medium" icon={<DeleteOutlined />}>
              </Button>
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
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
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

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-2">
            Bill Management
          </Title>
          <Text type="secondary">
            View and manage invoices
          </Text>
        </div>
        <Space>
          <Button
            icon={<FilePdfOutlined />}
            onClick={exportToPDF}
            type="primary"
            danger
          >
            Export PDF
          </Button>
        </Space>
      </div>

        {/* Filters */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Search by bill number or customer name"
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

      {/* Bills Table */}
      <Table
        columns={columns}
        dataSource={filteredBills}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} bills`,
        }}
        onChange={(pagination) => {
          fetchBills(pagination.current, pagination.pageSize);
        }}
        scroll={{ x: 1200 }}
      />


      {/* Payment Modal */}
      <Modal
        title={`Add Payment - ${selectedBill?.billNo || ""}`}
        open={showPaymentModal}
        onCancel={() => {
          setShowPaymentModal(false);
          setSelectedBill(null);
          paymentForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleAddPayment}
        >
          {selectedBill && (
            <Text type="secondary" className="block mb-4">
              Grand Total: ₹{(selectedBill?.grandTotal || 0).toFixed(2)} | Already Paid: ₹
              {getTotalPaid(selectedBill).toFixed(2)} | Due: ₹
              {getDueAmount(selectedBill).toFixed(2)}
            </Text>
          )}

          <Form.Item
            name="paymentMode"
            label="Payment Mode"
            rules={[{ required: true, message: "Please select payment mode" }]}
          >
            <Select placeholder="Select payment mode">
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="upi">UPI</Select.Option>
              <Select.Option value="card">Card</Select.Option>
              <Select.Option value="bank">Bank Transfer</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amountPaid"
            label="Amount Paid"
            rules={[
              { required: true, message: "Please enter amount" },
              {
                type: "number",
                min: 0.01,
                message: "Amount must be greater than 0",
              },
            ]}
          >
            <InputNumber
              placeholder="Enter amount"
              style={{ width: "100%" }}
              min={0.01}
              step={0.01}
              prefix="₹"
            />
          </Form.Item>

          <Form.Item name="transactionId" label="Transaction ID (Optional)">
            <Input placeholder="Enter transaction ID" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Add Payment
              </Button>
              <Button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedBill(null);
                  paymentForm.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Bill Modal */}
      <Modal
        title={`${selectedBill?.type === "quotation" ? "Quotation" : "Invoice"} - ${selectedBill?.billNo || ""}`}
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedBill(null);
        }}
        footer={[
          <Button
            key="print"
            icon={<FilePdfOutlined />}
            onClick={() => window.print()}
          >
            Print
          </Button>,
          <Button key="close" onClick={() => setShowViewModal(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedBill && (
          <div className="bill-view">
            <div className="mb-4">
              <Text strong>Bill No:</Text> {selectedBill.billNo}
              <br />
              <Text strong>Date:</Text>{" "}
              {selectedBill.billDate
                ? dayjs(selectedBill.billDate).format("DD/MM/YYYY")
                : "-"}
              <br />
              <Text strong>Type:</Text>{" "}
              <Tag color={selectedBill.type === "invoice" ? "green" : "blue"}>
                {selectedBill.type === "quotation" ? "Quotation" : "Invoice"}
              </Tag>
            </div>

            <Divider />

            <div className="mb-4">
              <Text strong>Customer:</Text>
              <br />
              {selectedBill.customer?.customer_name || "-"}
              <br />
              {selectedBill.customer?.phone && (
                <>
                  <Text type="secondary">Phone: {selectedBill.customer.phone}</Text>
                  <br />
                </>
              )}
              {selectedBill.branch?.branchName && (
                <>
                  <br />
                  <Text strong>Branch:</Text> {selectedBill.branch.branchName}
                </>
              )}
            </div>

            <Divider />

            <Table
              columns={[
                {
                  title: "Product",
                  dataIndex: ["product", "productName"],
                  key: "product",
                  render: (_, record) => record?.product?.productName || record?.product?.name || "-",
                },
                {
                  title: "Quantity",
                  dataIndex: "quantity",
                  key: "quantity",
                  align: "right",
                },
                {
                  title: "Unit Price",
                  dataIndex: "unitPrice",
                  key: "unitPrice",
                  align: "right",
                  render: (price) => `₹${(price || 0).toFixed(2)}`,
                },
                {
                  title: "Discount %",
                  dataIndex: "discountPercent",
                  key: "discountPercent",
                  align: "right",
                  render: (discount) => `${(discount || 0).toFixed(2)}%`,
                },
                {
                  title: "Tax %",
                  dataIndex: "taxPercent",
                  key: "taxPercent",
                  align: "right",
                  render: (tax) => `${(tax || 0).toFixed(2)}%`,
                },
                {
                  title: "Line Total",
                  dataIndex: "lineTotal",
                  key: "lineTotal",
                  align: "right",
                  render: (total) => `₹${(total || 0).toFixed(2)}`,
                },
              ]}
              dataSource={selectedBill?.items || []}
              rowKey="id"
              pagination={false}
              size="small"
            />

            <Divider />

            <div className="text-right mb-4">
              <Text strong>Grand Total: ₹{(selectedBill.grandTotal || 0).toFixed(2)}</Text>
            </div>

            {selectedBill.remarks && (
              <>
                <Divider />
                <div>
                  <Text strong>Remarks:</Text>
                  <br />
                  <Text>{selectedBill.remarks}</Text>
                </div>
              </>
            )}

            {selectedBill.type === "invoice" && (
              <>
                <Divider />
                <div>
                  <Text strong>Payment Status:</Text>{" "}
                  <Tag
                    color={
                      selectedBill.paymentStatus === "paid"
                        ? "green"
                        : selectedBill.paymentStatus === "partial"
                        ? "orange"
                        : "red"
                    }
                  >
                    {selectedBill.paymentStatus === "paid"
                      ? "Paid"
                      : selectedBill.paymentStatus === "partial"
                      ? "Partial"
                      : "Unpaid"}
                  </Tag>
                  <br />
                  <Text strong>Total Paid:</Text> ₹
                  {getTotalPaid(selectedBill).toFixed(2)}
                  <br />
                  <Text strong>Due Amount:</Text>{" "}
                  <Text type={getDueAmount(selectedBill) > 0 ? "danger" : "success"}>
                    ₹{getDueAmount(selectedBill).toFixed(2)}
                  </Text>
                </div>

                {selectedBill?.payments && selectedBill.payments.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Text strong>Payment History:</Text>
                      <Table
                        columns={[
                          {
                            title: "Date",
                            dataIndex: "paymentDate",
                            key: "paymentDate",
                            render: (date) =>
                              date ? dayjs(date).format("DD/MM/YYYY") : "-",
                          },
                          {
                            title: "Mode",
                            dataIndex: "paymentMode",
                            key: "paymentMode",
                            render: (mode) => mode?.toUpperCase() || "-",
                          },
                          {
                            title: "Amount",
                            dataIndex: "amountPaid",
                            key: "amountPaid",
                            align: "right",
                            render: (amount) => `₹${(amount || 0).toFixed(2)}`,
                          },
                          {
                            title: "Transaction ID",
                            dataIndex: "transactionId",
                            key: "transactionId",
                          },
                        ]}
                        dataSource={selectedBill?.payments || []}
                        rowKey="id"
                        pagination={false}
                        size="small"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillManagement;

