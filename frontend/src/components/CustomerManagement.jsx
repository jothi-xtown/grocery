import { useState, useEffect } from "react";
import {
  Button,
  Input,
  InputNumber,
  Table,
  Space,
  Form,
  Card,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { canEdit, canDelete, canCreate } from "../service/auth";

const CustomerManagement = () => {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  // Fetch customers
  const fetchCustomers = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/customers?page=${page}&limit=${limit}`);
      setCustomers(res.data.data || []);

      // Update pagination state
      setPagination(prev => ({
        ...prev,
        current: res.data.page || page,
        total: res.data.total || 0,
        pageSize: res.data.limit || limit,
      }));
    } catch (err) {
      console.error("Error fetching customers", err);
      message.error(err?.response?.data?.message || "Error fetching customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchCustomers(pagination.current, pagination.pageSize);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle form submit (create or update)
  const handleSubmit = async (values) => {
    try {
      const currentUser = localStorage.getItem("username") || "Unknown";
      const payload = {
        customer_name: values.customer_name?.trim(),
        pincode: values.pincode?.trim() || null,
        phone: values.phone?.trim(),
        old_balance: values.old_balance || 0,
        advance: values.advance || 0,
        credit_limit: values.credit_limit || 0,
        available_limit: values.available_limit || 0,
        balance: values.balance || 0,
        gst_pan_number: values.gst_pan_number?.trim() || null,
      };

      if (editingId) {
        payload.updatedBy = currentUser;
        await api.put(`/api/customers/${editingId}`, payload);
        message.success("Customer updated successfully");
      } else {
        payload.createdBy = currentUser;
        const res = await api.post("/api/customers", payload);
        setCustomers([res.data.data, ...customers]);
        message.success("Customer created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      form.resetFields();
      fetchCustomers();
    } catch (err) {
      console.error("Error saving customer", err);
      message.error(err?.response?.data?.message || "Error saving customer");
    }
  };

  // Handle edit
  const handleEdit = (record) => {
    setEditingId(record.id);
    setShowForm(true);
    form.setFieldsValue({
      customer_name: record.customer_name,
      pincode: record.pincode,
      phone: record.phone,
      old_balance: record.old_balance,
      advance: record.advance,
      credit_limit: record.credit_limit,
      available_limit: record.available_limit,
      balance: record.balance,
      gst_pan_number: record.gst_pan_number,
    });
  };

  // Handle hard delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/customers/${id}/hard`);
      message.success("Customer deleted successfully");
      setCustomers(customers.filter((customer) => customer.id !== id));
      fetchCustomers();
    } catch (err) {
      console.error("Error deleting customer", err);
      message.error(err?.response?.data?.message || "Error deleting customer");
    }
  };

  // PDF Export
  const exportToPDF = async () => {
    const res = await api.get("/api/customers?page=1&limit=1000");
    const allCustomers = res.data.data || [];

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer List</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Customer List</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Pincode</th>
                <th>GST/PAN</th>
                <th>Old Balance</th>
                <th>Advance</th>
                <th>Credit Limit</th>
                <th>Available Limit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${allCustomers
                .filter((c) =>
                  c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.phone?.includes(searchTerm)
                )
                .map(
                  (customer) => `
                <tr>
                  <td>${customer.customer_name || "-"}</td>
                  <td>${customer.phone || "-"}</td>
                  <td>${customer.pincode || "-"}</td>
                  <td>${customer.gst_pan_number || "-"}</td>
                  <td>₹${(customer.old_balance || 0).toFixed(2)}</td>
                  <td>₹${(customer.advance || 0).toFixed(2)}</td>
                  <td>₹${(customer.credit_limit || 0).toFixed(2)}</td>
                  <td>₹${(customer.available_limit || 0).toFixed(2)}</td>
                  <td>₹${(customer.balance || 0).toFixed(2)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Table columns
  const columns = [
    {
      title: "Customer Name",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (title) => (
        <div style={{ minWidth: 150, wordWrap: "break-word" }}>
          {title}
        </div>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    { title: "Pincode", dataIndex: "pincode", key: "pincode" },
    { title: "GST/PAN", dataIndex: "gst_pan_number", key: "gst_pan_number" },
    {
      title: "Old Balance",
      dataIndex: "old_balance",
      key: "old_balance",
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        return `₹${numValue.toFixed(2)}`;
      },
    },
    {
      title: "Advance",
      dataIndex: "advance",
      key: "advance",
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        return `₹${numValue.toFixed(2)}`;
      },
    },
    {
      title: "Credit Limit",
      dataIndex: "credit_limit",
      key: "credit_limit",
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        return `₹${numValue.toFixed(2)}`;
      },
    },
    {
      title: "Available Limit",
      dataIndex: "available_limit",
      key: "available_limit",
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        return `₹${numValue.toFixed(2)}`;
      },
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      render: (value) => {
        const numValue = parseFloat(value) || 0;
        const color = numValue >= 0 ? "#52c41a" : "#ff4d4f";
        return (
          <span style={{ color, fontWeight: "bold" }}>
            ₹{numValue.toFixed(2)}
          </span>
        );
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
          {canEdit() && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {canDelete() && (
            <Popconfirm
              title="Are you sure to delete this record permanently?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Management</h1>
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
              icon={<PlusOutlined />}
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                form.resetFields();
              }}
              type="primary"
            >
              {showForm ? "Cancel" : "Add Customer"}
            </Button>
          )}
        </Space>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <Form layout="vertical" form={form} onFinish={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="customer_name"
                label="Customer Name"
                rules={[
                  { required: true, message: "Customer name is required" },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[
                  { required: true, message: "Phone number is required" },
                  { pattern: /^\d{10,11}$/, message: "Phone number must be 10 digits" }
                ]}
              >
                <Input
                  maxLength={11}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="pincode"
                label="Pincode"
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="gst_pan_number"
                label="GST/PAN Number"
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="old_balance"
                label="Old Balance"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="advance"
                label="Advance"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="credit_limit"
                label="Credit Limit"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="available_limit"
                label="Available Limit"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="balance"
                label="Balance"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  precision={2}
                  placeholder="Enter balance (can be negative)"
                />
              </Form.Item>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingId ? "Update Customer" : "Add Customer"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Input.Search
          placeholder="Search by customer name or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        <Button
          onClick={() => {
            setSearchTerm('');
          }}
          disabled={!searchTerm}
        >
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={(customers || []).filter((c) => {
          const searchMatch =
            c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm);

          return searchMatch;
        })}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} customers`
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default CustomerManagement;

