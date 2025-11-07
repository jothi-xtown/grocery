import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Card,
  Typography,
  message,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Space,
  Spin,
} from "antd";
import {
  FilePdfOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TagOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../service/api";
import { capitalizeTableText } from "../utils/textUtils";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SalesReport = () => {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [dateRange, setDateRange] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Fetch branches and customers
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [branchesRes, customersRes] = await Promise.all([
          api.get("/api/branches?limit=1000"),
          api.get("/api/customers?limit=1000"),
        ]);
        setBranches(branchesRes.data.data || []);
        setCustomers(customersRes.data.data || []);
      } catch (err) {
        console.error("Error fetching filters", err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch sales report
  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period && period !== "custom") {
        params.append("period", period);
      } else if (dateRange && dateRange.length === 2) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }
      if (branchId) params.append("branchId", branchId);
      if (customerId) params.append("customerId", customerId);

      const res = await api.get(`/api/bill/reports/sales?${params.toString()}`);
      
      if (res.data.success) {
        setReportData(res.data.data.salesData || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error("Error fetching sales report", err);
      message.error(err?.response?.data?.message || "Error fetching sales report");
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, [period, dateRange, branchId, customerId]);

  // Handle period change
  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      setDateRange(null);
    }
  };

  // PDF Export
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
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
            <h1>Sales Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            ${summary ? `<p>Period: ${summary.period || "N/A"}</p>` : ""}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Items</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.date || '-'}</td>
                  <td>${item.invoiceNo || '-'}</td>
                  <td>${item.customer || '-'}</td>
                  <td>${item.branch || '-'}</td>
                  <td>${item.items || 0}</td>
                  <td>${item.quantity || 0}</td>
                  <td>₹${(item.amount || 0).toFixed(2)}</td>
                  <td>₹${(item.discount || 0).toFixed(2)}</td>
                  <td>₹${(item.tax || 0).toFixed(2)}</td>
                  <td>₹${(item.total || 0).toFixed(2)}</td>
                  <td>${item.paymentStatus || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${summary ? `
          <div class="summary">
            <div class="total">Total Sales: ₹${summary.totalSales?.toFixed(2) || '0.00'}</div>
            <p><strong>Total Discount:</strong> ₹${summary.totalDiscount?.toFixed(2) || '0.00'}</p>
            <p><strong>Total Tax:</strong> ₹${summary.totalTax?.toFixed(2) || '0.00'}</p>
            <p><strong>Net Revenue:</strong> ₹${summary.netRevenue?.toFixed(2) || '0.00'}</p>
            <p><strong>Total Quantity:</strong> ${summary.totalQuantity?.toFixed(2) || '0'}</p>
            <p><strong>Total Invoices:</strong> ${summary.totalInvoices || 0}</p>
          </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Table columns
  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      align: "left",
      render: (text) => text || "-",
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 150,
      align: "left",
      render: (text) => text || "-",
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 180,
      align: "left",
      render: (text) => capitalizeTableText(text, "customer") || "-",
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      width: 150,
      align: "left",
      render: (text) => capitalizeTableText(text, "branch") || "-",
    },
    {
      title: "Items",
      dataIndex: "items",
      key: "items",
      width: 80,
      align: "center",
      render: (value) => value || 0,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
      render: (value) => (value || 0).toFixed(2),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      align: "right",
      render: (value) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      title: "Discount",
      dataIndex: "discount",
      key: "discount",
      width: 120,
      align: "right",
      render: (value) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      title: "Tax",
      dataIndex: "tax",
      key: "tax",
      width: 120,
      align: "right",
      render: (value) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 130,
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: "bold", color: "#1890ff" }}>
          ₹{(value || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 130,
      align: "center",
      render: (status) => {
        const colorMap = {
          paid: "#52c41a",
          partial: "#faad14",
          unpaid: "#ff4d4f",
        };
        return (
          <span style={{ color: colorMap[status] || "#666" }}>
            {status ? status.toUpperCase() : "-"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Sales Report</Title>
          <Text type="secondary">Detailed sales analysis with filters</Text>
        </div>
        <Button
          icon={<FilePdfOutlined />}
          onClick={exportToPDF}
          type="primary"
          danger
        >
          Export PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Period:</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={period}
                onChange={handlePeriodChange}
              >
                <Select.Option value="today">Today</Select.Option>
                <Select.Option value="weekly">This Week</Select.Option>
                <Select.Option value="monthly">This Month</Select.Option>
                <Select.Option value="custom">Custom Range</Select.Option>
              </Select>
            </Col>
            {period === "custom" && (
              <Col xs={24} sm={12} md={6}>
                <Text strong>Date Range:</Text>
                <RangePicker
                  style={{ width: "100%", marginTop: 8 }}
                  value={dateRange}
                  onChange={setDateRange}
                />
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <Text strong>Branch:</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={branchId}
                onChange={setBranchId}
                allowClear
                placeholder="All Branches"
              >
                {branches.map((branch) => (
                  <Select.Option key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text strong>Customer:</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={customerId}
                onChange={setCustomerId}
                allowClear
                placeholder="All Customers"
              >
                {customers.map((customer) => (
                  <Select.Option key={customer.id} value={customer.id}>
                    {customer.customer_name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Sales"
                value={summary.totalSales || 0}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Discount"
                value={summary.totalDiscount || 0}
                prefix={<TagOutlined />}
                precision={2}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Tax"
                value={summary.totalTax || 0}
                prefix={<FileTextOutlined />}
                precision={2}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Net Revenue"
                value={summary.netRevenue || 0}
                prefix={<ShoppingOutlined />}
                precision={2}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Report Table */}
      <Card title="Sales Details">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={reportData}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
        {reportData.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <p>No sales data available</p>
            <p className="text-sm">Please select a date range and generate the report</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SalesReport;

