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
  WalletOutlined,
  CreditCardOutlined,
  BankOutlined,
  MobileOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../service/api";
import { capitalizeTableText } from "../utils/textUtils";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PaymentCollectionReport = () => {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [dateRange, setDateRange] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);
  const [graphData, setGraphData] = useState([]);

  // Fetch payment collection report
  const fetchPaymentCollectionReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period && period !== "custom") {
        params.append("period", period);
      } else if (dateRange && dateRange.length === 2) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }
      if (paymentMode) params.append("paymentMode", paymentMode);

      const res = await api.get(`/api/bill/reports/payment-collection?${params.toString()}`);
      
      if (res.data.success) {
        setReportData(res.data.data.collectionData || []);
        setSummary(res.data.data.summary || {});
        setGraphData(res.data.data.graphData || []);
      }
    } catch (err) {
      console.error("Error fetching payment collection report", err);
      message.error(err?.response?.data?.message || "Error fetching payment collection report");
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentCollectionReport();
  }, [period, dateRange, paymentMode]);

  // Handle period change
  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      setDateRange(null);
    }
  };

  // Prepare pie chart data
  const pieData = summary?.paymentModeBreakdown ? [
    { name: "Cash", value: summary.paymentModeBreakdown.cash || 0 },
    { name: "UPI", value: summary.paymentModeBreakdown.upi || 0 },
    { name: "Card", value: summary.paymentModeBreakdown.card || 0 },
    { name: "Bank", value: summary.paymentModeBreakdown.bank || 0 },
  ].filter(item => item.value > 0) : [];

  const COLORS = ["#1890ff", "#52c41a", "#faad14", "#722ed1"];

  // PDF Export
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Collection Report</title>
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
            <h1>Payment Collection Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Payment Mode</th>
                <th>Amount</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.date || '-'}</td>
                  <td>${item.invoiceNo || '-'}</td>
                  <td>${item.customer || '-'}</td>
                  <td>${item.paymentMode?.toUpperCase() || '-'}</td>
                  <td>₹${(item.amount || 0).toFixed(2)}</td>
                  <td>${item.transactionId || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${summary ? `
          <div class="summary">
            <div class="total">Total Collected: ₹${summary.totalCollected?.toFixed(2) || '0.00'}</div>
            <p><strong>Payment Mode Breakdown:</strong></p>
            <ul>
              <li>Cash: ₹${summary.paymentModeBreakdown?.cash?.toFixed(2) || '0.00'}</li>
              <li>UPI: ₹${summary.paymentModeBreakdown?.upi?.toFixed(2) || '0.00'}</li>
              <li>Card: ₹${summary.paymentModeBreakdown?.card?.toFixed(2) || '0.00'}</li>
              <li>Bank: ₹${summary.paymentModeBreakdown?.bank?.toFixed(2) || '0.00'}</li>
            </ul>
            <p><strong>Total Payments:</strong> ${summary.totalPayments || 0}</p>
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
      title: "Payment Mode",
      dataIndex: "paymentMode",
      key: "paymentMode",
      width: 130,
      align: "center",
      render: (mode) => {
        const colorMap = {
          cash: "#52c41a",
          upi: "#1890ff",
          card: "#faad14",
          bank: "#722ed1",
        };
        return (
          <span style={{ 
            color: colorMap[mode] || "#666",
            fontWeight: "bold",
            textTransform: "uppercase"
          }}>
            {mode || "-"}
          </span>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: "bold", color: "#1890ff" }}>
          ₹{(value || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: "Transaction ID",
      dataIndex: "transactionId",
      key: "transactionId",
      width: 180,
      align: "left",
      render: (text) => text || "-",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Payment Collection Report</Title>
          <Text type="secondary">Payment collection by mode and period</Text>
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
            <Col xs={24} sm={12} md={8}>
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
              <Col xs={24} sm={12} md={8}>
                <Text strong>Date Range:</Text>
                <RangePicker
                  style={{ width: "100%", marginTop: 8 }}
                  value={dateRange}
                  onChange={setDateRange}
                />
              </Col>
            )}
            <Col xs={24} sm={12} md={8}>
              <Text strong>Payment Mode:</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={paymentMode}
                onChange={setPaymentMode}
                allowClear
                placeholder="All Payment Modes"
              >
                <Select.Option value="cash">Cash</Select.Option>
                <Select.Option value="upi">UPI</Select.Option>
                <Select.Option value="card">Card</Select.Option>
                <Select.Option value="bank">Bank</Select.Option>
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
                title="Total Collected"
                value={summary.totalCollected || 0}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Cash"
                value={summary.paymentModeBreakdown?.cash || 0}
                prefix={<WalletOutlined />}
                precision={2}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="UPI"
                value={summary.paymentModeBreakdown?.upi || 0}
                prefix={<MobileOutlined />}
                precision={2}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Card"
                value={summary.paymentModeBreakdown?.card || 0}
                prefix={<CreditCardOutlined />}
                precision={2}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts */}
      <Row gutter={[24, 24]} className="mb-8">
        {graphData.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Collection Trend">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#1890ff" strokeWidth={2} name="Collection (₹)" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}
        {pieData.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Payment Mode Distribution">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}
      </Row>

      {/* Report Table */}
      <Card title="Payment Collection Details">
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
            scroll={{ x: 1000 }}
          />
        </Spin>
        {reportData.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <p>No payment collection data available</p>
            <p className="text-sm">Please select a date range and generate the report</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentCollectionReport;

