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
  ShoppingCartOutlined,
  RiseOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../service/api";
import { capitalizeTableText } from "../utils/textUtils";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ProfitLossReport = () => {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [dateRange, setDateRange] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [branches, setBranches] = useState([]);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/api/branches?limit=1000");
        setBranches(res.data.data || []);
      } catch (err) {
        console.error("Error fetching branches", err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch profit & loss report
  const fetchProfitLossReport = async () => {
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

      const res = await api.get(`/api/bill/reports/profit-loss?${params.toString()}`);
      
      if (res.data.success) {
        setReportData(res.data.data.profitLossData || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error("Error fetching profit & loss report", err);
      message.error(err?.response?.data?.message || "Error fetching profit & loss report");
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitLossReport();
  }, [period, dateRange, branchId]);

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
          <title>Profit & Loss Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
            .total { font-size: 18px; font-weight: bold; color: #1890ff; }
            .profit { color: #52c41a; }
            .loss { color: #ff4d4f; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Profit & Loss Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.date || '-'}</td>
                  <td>${item.invoiceNo || '-'}</td>
                  <td>₹${(item.revenue || 0).toFixed(2)}</td>
                  <td>₹${(item.cost || 0).toFixed(2)}</td>
                  <td class="${item.profit >= 0 ? 'profit' : 'loss'}">₹${(item.profit || 0).toFixed(2)}</td>
                  <td>${(item.margin || 0).toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${summary ? `
          <div class="summary">
            <div class="total">Total Revenue: ₹${summary.totalRevenue?.toFixed(2) || '0.00'}</div>
            <p><strong>Total Cost:</strong> ₹${summary.totalCost?.toFixed(2) || '0.00'}</p>
            <p class="${summary.grossProfit >= 0 ? 'profit' : 'loss'}"><strong>Gross Profit:</strong> ₹${summary.grossProfit?.toFixed(2) || '0.00'}</p>
            <p class="${summary.netProfit >= 0 ? 'profit' : 'loss'}"><strong>Net Profit:</strong> ₹${summary.netProfit?.toFixed(2) || '0.00'}</p>
            <p><strong>Profit Margin:</strong> ${summary.profitMargin?.toFixed(2) || '0.00'}%</p>
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
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      width: 130,
      align: "right",
      render: (value) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      title: "Cost",
      dataIndex: "cost",
      key: "cost",
      width: 130,
      align: "right",
      render: (value) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 130,
      align: "right",
      render: (value) => (
        <span style={{ 
          fontWeight: "bold", 
          color: value >= 0 ? "#52c41a" : "#ff4d4f" 
        }}>
          ₹{(value || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: "Margin %",
      dataIndex: "margin",
      key: "margin",
      width: 110,
      align: "right",
      render: (value) => `${(value || 0).toFixed(2)}%`,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Profit & Loss Report</Title>
          <Text type="secondary">Revenue vs cost analysis</Text>
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
          </Row>
        </Space>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={summary.totalRevenue || 0}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Cost"
                value={summary.totalCost || 0}
                prefix={<ShoppingCartOutlined />}
                precision={2}
                valueStyle={{ color: "#fa8c16" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Gross Profit"
                value={summary.grossProfit || 0}
                prefix={<RiseOutlined />}
                precision={2}
                valueStyle={{ 
                  color: (summary.grossProfit || 0) >= 0 ? "#52c41a" : "#ff4d4f" 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Profit Margin"
                value={summary.profitMargin || 0}
                suffix="%"
                prefix={<PercentageOutlined />}
                precision={2}
                valueStyle={{ 
                  color: (summary.profitMargin || 0) >= 0 ? "#52c41a" : "#ff4d4f" 
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Report Table */}
      <Card title="Profit & Loss Details">
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
            <p>No profit & loss data available</p>
            <p className="text-sm">Please select a date range and generate the report</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProfitLossReport;

