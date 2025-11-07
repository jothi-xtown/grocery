import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Space,
  Typography,
  Spin,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  ShopOutlined,
  HomeOutlined,
  FileTextOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCost: 0,
    profit: 0,
    loss: 0,
    graphData: [],
  });
  const [period, setPeriod] = useState("monthly");
  const [entityStats, setEntityStats] = useState({
    totalCustomers: 0,
    totalSuppliers: 0,
    totalBranches: 0,
    pendingInvoices: 0,
    totalDues: 0,
  });
  const [entityLoading, setEntityLoading] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/bill/dashboard/stats?period=${period}`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch entity statistics
  const fetchEntityStats = async () => {
    setEntityLoading(true);
    try {
      const [customersRes, suppliersRes, branchesRes, billsRes, accountsRes] =
        await Promise.all([
          api.get("/api/customers?limit=1000").catch(() => ({ data: { success: true, data: [] } })),
          api.get("/api/suppliers?limit=1000").catch(() => ({ data: { success: true, data: [] } })),
          api.get("/api/branches?limit=1000").catch(() => ({ data: { success: true, data: [] } })),
          api.get("/api/bill?limit=1000").catch(() => ({ data: { success: true, data: [] } })),
          api.get("/api/accounts?limit=1000").catch(() => ({ data: { success: true, data: [] } })),
        ]);

      // Handle different response formats
      const getData = (res) => {
        if (res.data?.data) {
          return Array.isArray(res.data.data) ? res.data.data : [];
        }
        return [];
      };

      const customers = getData(customersRes);
      const suppliers = getData(suppliersRes);
      const branches = getData(branchesRes);
      const bills = getData(billsRes);
      const accounts = getData(accountsRes);

      // Count pending invoices (invoices with paymentStatus !== "paid")
      const invoices = bills.filter(
        (bill) => bill.type === "invoice" && bill.paymentStatus !== "paid"
      );

      // Calculate total dues from accounts
      const totalDues = accounts.reduce(
        (sum, account) => sum + (parseFloat(account.dueAmount) || 0),
        0
      );

      // Get count from response total field or array length
      const getCount = (res, data) => {
        if (res.data?.total !== undefined) {
          return res.data.total;
        }
        return Array.isArray(data) ? data.length : 0;
      };

      setEntityStats({
        totalCustomers: getCount(customersRes, customers),
        totalSuppliers: getCount(suppliersRes, suppliers),
        totalBranches: getCount(branchesRes, branches),
        pendingInvoices: invoices.length,
        totalDues: totalDues,
      });
    } catch (err) {
      console.error("Error fetching entity stats", err);
    } finally {
      setEntityLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchEntityStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Format currency
  const formatCurrency = (value) => {
    return `₹${value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (period === "today") {
      return dayjs(dateStr).format("HH:mm");
    } else if (period === "weekly") {
      return dayjs(dateStr).format("ddd DD/MM");
    } else {
      return dayjs(dateStr).format("DD/MM");
    }
  };

  // Prepare graph data
  const chartData = (stats.graphData || []).map((item) => ({
    ...item,
    dateLabel: formatDate(item.date),
  }));

  // Calculate net profit (Total Sales - Total Cost)
  const netProfit = stats.totalSales - stats.totalCost;

  return (
    <div style={{ padding: "24px", gap: "24px", display: "flex", flexDirection: "column" }}>
      <style>{`
        @media (max-width: 640px) {
          .mobile-card .ant-card-body {
            padding: 12px !important;
          }
          .mobile-card .ant-statistic-title {
            font-size: 12px !important;
            margin-bottom: 4px !important;
          }
          .mobile-card .ant-statistic-content {
            font-size: 16px !important;
          }
          .mobile-card .ant-statistic-content-value {
            font-size: 16px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <Title level={2} className="mb-2">
            Dashboard
          </Title>
          <Text type="secondary">
            Overview of sales, profit, and loss analytics
          </Text>
        </div>
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 120 }}
            size="large"
          >
            <Option value="today">Today</Option>
            <Option value="weekly">Weekly</Option>
            <Option value="monthly">Monthly</Option>
          </Select>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="mobile-card">
            <Statistic
              title="Total Sales"
              value={stats.totalSales}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#1890ff", fontSize: "20px" }}
              formatter={(value) => formatCurrency(value)}
            />
            <Text type="secondary" className="text-xs">
              {stats.startDate && stats.endDate
                ? `${dayjs(stats.startDate).format("DD/MM/YYYY")} - ${dayjs(
                    stats.endDate
                  ).format("DD/MM/YYYY")}`
                : ""}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Entity Statistics - Separate Cards */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={8} lg={4.8} xl={4.8}>
          <Card size="small" className="mobile-card" style={{ height: "100%" }}>
            <Spin spinning={entityLoading}>
            <Statistic
                title="Total Customers"
                value={entityStats.totalCustomers}
              prefix={<UserOutlined />}
                valueStyle={{ color: "#1890ff", fontSize: "20px" }}
            />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} xl={4.8}>
          <Card size="small" className="mobile-card" style={{ height: "100%" }}>
            <Spin spinning={entityLoading}>
            <Statistic
                title="Total Suppliers"
                value={entityStats.totalSuppliers}
                prefix={<ShopOutlined />}
                valueStyle={{ color: "#52c41a", fontSize: "20px" }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} xl={4.8}>
          <Card size="small" className="mobile-card" style={{ height: "100%" }}>
            <Spin spinning={entityLoading}>
            <Statistic
                title="Total Branches"
                value={entityStats.totalBranches}
              prefix={<HomeOutlined />}
                valueStyle={{ color: "#722ed1", fontSize: "20px" }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} xl={4.8}>
          <Card size="small" className="mobile-card" style={{ height: "100%" }}>
            <Spin spinning={entityLoading}>
              <Statistic
                title="Pending Invoices"
                value={entityStats.pendingInvoices}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#fa8c16", fontSize: "20px" }}
              />
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} xl={4.8}>
          <Card size="small" className="mobile-card" style={{ height: "100%" }}>
            <Spin spinning={entityLoading}>
            <Statistic
                title="Total Dues"
                value={entityStats.totalDues}
                prefix={<CreditCardOutlined />}
                valueStyle={{ color: "#ff4d4f", fontSize: "20px" }}
                formatter={(value) => formatCurrency(value)}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* Sales Graph and Financial Summary in Same Row */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card
            title={`Sales Analytics - ${period.charAt(0).toUpperCase() + period.slice(1)}`}
            extra={
              <Text type="secondary">
                {stats.startDate && stats.endDate
                  ? `${dayjs(stats.startDate).format("DD/MM/YYYY")} - ${dayjs(
                      stats.endDate
                    ).format("DD/MM/YYYY")}`
                  : ""}
                  </Text>
            }
          >
            <Spin spinning={loading}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateLabel"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(label) =>
                        period === "today" ? `Time: ${label}` : `Date: ${label}`
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#1890ff"
                      strokeWidth={2}
                      name="Sales"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#ff4d4f"
                      strokeWidth={2}
                      name="Cost"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#52c41a"
                      strokeWidth={2}
                      name="Profit"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No sales data available for the selected period
          </div>
        )}
            </Spin>
      </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title="Financial Summary" 
            size="small"
            style={{ height: "100%" }}
            bodyStyle={{ padding: "20px" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Net Profit - Highlighted and Centered */}
              <div style={{ 
                textAlign: "center", 
                padding: "20px 16px",
                background: netProfit >= 0 
                  ? "linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)" 
                  : "linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 77, 79, 0.05) 100%)",
                borderRadius: "8px",
                border: `1px solid ${netProfit >= 0 ? "rgba(82, 196, 26, 0.3)" : "rgba(255, 77, 79, 0.3)"}`
              }}>
                <div style={{ 
                  fontSize: "12px", 
                  fontWeight: 600,
                  color: "#8c8c8c",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Net Profit
                </div>
                <div style={{ 
                  fontSize: "32px", 
                  fontWeight: 700,
                  color: netProfit >= 0 ? "#52c41a" : "#ff4d4f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}>
                  {netProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  {formatCurrency(Math.abs(netProfit))}
                </div>
              </div>

              {/* Total Cost and Loss - Well Aligned */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Total Cost */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  padding: "14px 0",
                  borderBottom: "1px solid #f0f0f0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <DollarOutlined style={{ 
                      fontSize: "20px", 
                      color: "#faad14" 
                    }} />
                    <span style={{ 
                      fontSize: "14px", 
                      color: "#595959",
                      fontWeight: 500
                    }}>
                      Total Cost
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: "18px", 
                    fontWeight: 600,
                    color: "#faad14"
                  }}>
                    {formatCurrency(stats.totalCost)}
                  </span>
                </div>

                {/* Loss */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  padding: "14px 0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <FallOutlined style={{ 
                      fontSize: "20px", 
                      color: "#ff4d4f" 
                    }} />
                    <span style={{ 
                      fontSize: "14px", 
                      color: "#595959",
                      fontWeight: 500
                    }}>
                      Loss
                    </span>
                </div>
                  <span style={{ 
                    fontSize: "18px", 
                    fontWeight: 600,
                    color: "#ff4d4f"
                  }}>
                    {formatCurrency(stats.loss)}
                  </span>
              </div>
              </div>
          </div>
        </Card>
        </Col>
      </Row>
   
    </div>
  );
};

export default Dashboard;
