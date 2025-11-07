import { useState, useEffect } from "react";
import {
  Button,
  Input,
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
import { capitalizeTableText } from "../utils/textUtils";

const BranchManagement = () => {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([]);
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

  // Fetch branches
  const fetchBranches = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/branches?page=${page}&limit=${limit}`);
      setBranches(res.data.data || []);

      // Update pagination state
      setPagination(prev => ({
        ...prev,
        current: res.data.page || page,
        total: res.data.total || 0,
        pageSize: res.data.limit || limit,
      }));
    } catch (err) {
      console.error("Error fetching branches", err);
      message.error("Error fetching branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches(pagination.current, pagination.pageSize);
  }, []);

  // Handle form submit (create or update)
  const handleSubmit = async (values) => {
    try {
      const payload = {
        branchName: values.branchName?.trim(),
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim(),
      };

      if (editingId) {
        await api.put(`/api/branches/${editingId}`, payload);
        message.success("Branch updated successfully");
      } else {
        const res = await api.post("/api/branches", payload);
        setBranches([res.data.data, ...branches]);
        message.success("Branch created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      form.resetFields();
      fetchBranches(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error saving branch", err);
      const errorData = err?.response?.data;
      const errorMessage = errorData?.message 
        || errorData?.error 
        || (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0
          ? errorData.errors.map(e => `${e.field || e.path || "unknown"}: ${e.message}`).join(", ")
          : null)
        || err?.message 
        || "Error saving branch";
      message.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (record) => {
    setEditingId(record.id);
    setShowForm(true);
    form.setFieldsValue({
      branchName: record.branchName,
      phone: record.phone,
      email: record.email,
      address: record.address,
    });
  };

  // Handle hard delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/branches/${id}/hard`);
      message.success("Branch deleted successfully");
      fetchBranches(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error deleting branch", err);
      const errorData = err?.response?.data;
      const errorMessage = errorData?.message 
        || errorData?.error 
        || err?.message 
        || "Error deleting branch";
      message.error(errorMessage);
    }
  };

  // Handle table change
  const handleTableChange = (pagination) => {
    fetchBranches(pagination.current, pagination.pageSize);
  };

  // PDF Export
  const exportToPDF = async () => {
    try {
      const res = await api.get("/api/branches?page=1&limit=1000");
      const allBranches = res.data.data || [];
      
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
      <html>
        <head>
          <title>Branch List</title>
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
            <h1>Branch List</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              ${allBranches
                .filter((b) =>
                  b.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  b.address?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(
                  (branch) => `
                <tr>
                  <td>${branch.branchName || "-"}</td>
                  <td>${branch.phone || "-"}</td>
                  <td>${branch.email || "-"}</td>
                  <td>${branch.address || "-"}</td>
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
    } catch (err) {
      console.error("Error exporting PDF", err);
      message.error("Error exporting PDF");
    }
  };

  // Table columns
  const columns = [
    { 
      title: "Branch Name", 
      dataIndex: "branchName", 
      key: "branchName",
      render: (name) => capitalizeTableText(name, "branchName")
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (phone) => phone || "-",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => email || "-",
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      render: (address) => (
        <div style={{ maxWidth: 300, wordWrap: "break-word" }}>
          {capitalizeTableText(address, "address") || "-"}
        </div>
      ),
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
        <h1 className="text-2xl font-bold">Branch Management</h1>
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
              {showForm ? "Cancel" : "Add Branch"}
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
                name="branchName"
                label="Branch Name"
                rules={[{ required: true, message: "Branch name is required" }]}
              >
                <Input placeholder="Enter branch name" />
              </Form.Item>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[
                  {
                    pattern: /^\d{10,11}$/,
                    message: "Phone number must be 10 digits (mobile) or 11 digits (landline)"
                  }
                ]}
              >
                <Input 
                  placeholder="Optional (10 or 11 digits)" 
                  maxLength={11}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    const pasteData = e.clipboardData.getData("Text");
                    if (!/^\d*$/.test(pasteData)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { type: "email", message: "Please enter a valid email address" }
                ]}
              >
                <Input placeholder="Enter email address (optional)" />
              </Form.Item>
              <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true, message: "Address is required" }]}
                className="col-span-2"
              >
                <Input.TextArea rows={3} placeholder="Enter full address" />
              </Form.Item>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingId ? "Update Branch" : "Add Branch"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Input.Search
          placeholder="Search by branch name or address"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Button
          onClick={() => setSearchTerm('')}
          disabled={!searchTerm}
        >
          Clear Search
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={(branches || []).filter((b) => {
          const searchMatch =
            b.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.email?.toLowerCase().includes(searchTerm.toLowerCase());
          return searchMatch;
        })}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} branches`
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default BranchManagement;
