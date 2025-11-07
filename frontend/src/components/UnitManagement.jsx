import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Table,
  Tag,
  Space,
  Form,
  Select,
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

const UnitManagement = () => {
  const [form] = Form.useForm();
  const [units, setUnits] = useState([]);
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

  const [statusFilter, setStatusFilter] = useState(null);

  // Fetch units
  const fetchUnits = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/units?page=${page}&limit=${limit}`);
      setUnits(res.data.data || []);

      // Update pagination state
      setPagination(prev => ({
        ...prev,
        current: res.data.page || page,
        total: res.data.total || 0,
      }));
    } catch (err) {
      console.error("Error fetching units", err);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(pagination.current, pagination.pageSize);
  }, []);

  // Handle form submit (create or update)
  const handleSubmit = async (values) => {
    try {
      const payload = {
        unitName: values.unitName,
        unitStatus: values.unitStatus === "active", // Convert Active/Inactive to boolean
      };

      if (editingId) {
        await api.put(`/api/units/${editingId}`, payload);
        message.success("Unit updated successfully");
      } else {
        const res = await api.post("/api/units", payload);
        setUnits([res.data.data, ...units]);
        message.success("Unit created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      form.resetFields();
      fetchUnits(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error saving unit", err);
      const errorData = err?.response?.data;
      const errorMessage = errorData?.message 
        || errorData?.error 
        || (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0
          ? errorData.errors.map(e => `${e.field || e.path || "unknown"}: ${e.message}`).join(", ")
          : null)
        || err?.message 
        || "Error saving unit";
      message.error(errorMessage);
    }
  };

  // Handle edit
  const handleEdit = (record) => {
    setEditingId(record.id);
    setShowForm(true);
    form.setFieldsValue({
      unitName: record.unitName,
      unitStatus: record.unitStatus ? "active" : "inactive", // Convert boolean to Active/Inactive
    });
  };

  // Handle hard delete
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/units/${id}/hard`);
      message.success("Unit deleted successfully");
      fetchUnits(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error("Error deleting unit", err);
      const errorData = err?.response?.data;
      const errorMessage = errorData?.message 
        || errorData?.error 
        || err?.message 
        || "Error deleting unit";
      message.error(errorMessage);
    }
  };

  // Handle table change
  const handleTableChange = (pagination) => {
    fetchUnits(pagination.current, pagination.pageSize);
  };

  // PDF Export
  const exportToPDF = async () => {
    const res = await api.get("/api/units?page=1&limit=1000");
    const allUnits = res.data.data || [];

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Unit List</title>
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
            <h1>Unit List</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Unit Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${allUnits
                .filter((u) =>
                  u.unitName?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(
                  (unit) => `
                <tr>
                  <td>${unit.unitName}</td>
                  <td>${unit.unitStatus ? "Active" : "Inactive"}</td>
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
      title: "Unit Name", 
      dataIndex: "unitName", 
      key: "unitName",
      render: (name) => capitalizeTableText(name, "unitName")
    },
    {
      title: "Status",
      dataIndex: "unitStatus",
      key: "unitStatus",
      render: (status) => {
        const isActive = status === true || status === "true";
        return (
          <Tag color={isActive ? "green" : "red"}>
            {isActive ? "Active" : "Inactive"}
          </Tag>
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
              title="Are you sure to delete?"
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
        <h1 className="text-2xl font-bold">Unit Management</h1>
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
              {showForm ? "Cancel" : "Add Unit"}
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
                name="unitName"
                label="Unit Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="unitStatus"
                label="Status"
                rules={[{ required: true }]}
                initialValue="active"
              >
                <Select>
                  <Select.Option value="active">Active</Select.Option>
                  <Select.Option value="inactive">Inactive</Select.Option>
                </Select>
              </Form.Item>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingId ? "Update Unit" : "Add Unit"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Input.Search
          placeholder="Search by unit name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        <Select
          placeholder="Filter by Status"
          allowClear
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          style={{ width: 180 }}
        >
          <Select.Option value="active">Active</Select.Option>
          <Select.Option value="inactive">Inactive</Select.Option>
        </Select>

        <Button
          onClick={() => {
            setSearchTerm('');
            setStatusFilter(null);
          }}
          disabled={!searchTerm && !statusFilter}
        >
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={(units || []).filter((u) => {
          const searchMatch = u.unitName?.toLowerCase().includes(searchTerm.toLowerCase());

          const statusMatch = statusFilter
            ? (statusFilter === "active" && u.unitStatus === true) ||
              (statusFilter === "inactive" && u.unitStatus === false)
            : true;

          return searchMatch && statusMatch;
        })}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} units`
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default UnitManagement;

