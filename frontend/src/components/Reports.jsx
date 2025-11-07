import {
  Card,
  Row,
  Col,
  Button,
  Typography,
} from "antd";
import {
  FileTextOutlined,
  DollarOutlined,
  RiseOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const Reports = () => {
  const navigate = useNavigate();

  const reportTypes = [
    {
      title: "Sales Report",
      description: "Daily/weekly/monthly sales with filters and detailed analysis",
      icon: <DollarOutlined />,
      path: "/reports/sales",
      color: "#1890ff",
    },
    {
      title: "Profit & Loss Report",
      description: "Revenue vs cost analysis with profit margin calculations",
      icon: <RiseOutlined />,
      path: "/reports/profit-loss",
      color: "#52c41a",
    },
    {
      title: "Accounts Receivable Report",
      description: "Customer dues and aging analysis (0-30, 31-60, 61-90, 90+ days)",
      icon: <UserOutlined />,
      path: "/reports/accounts-receivable",
      color: "#ff4d4f",
    },
    {
      title: "Payment Collection Report",
      description: "Payment collection by mode (Cash, UPI, Card, Bank) and period",
      icon: <WalletOutlined />,
      path: "/reports/payment-collection",
      color: "#fa8c16",
    },
    {
      title: "Item Stock Report",
      description: "Opening, Inward, Outward, and Balance report for all items",
      icon: <FileTextOutlined />,
      path: "/reports/item-stock",
      color: "#13c2c2",
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen ">
      {/* Header */}
      <div className="mb-6">
        <Title level={2} className="mb-2">
          Reports & Analytics
        </Title>
        <Text type="secondary">
          Generate comprehensive reports for better business insights and decision making.
        </Text>
      </div>

      {/* Reports Grid */}
      <Row gutter={[24, 24]}>
        {reportTypes.map((report, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              hoverable
              className="text-center h-full"
              style={{ 
                border: `2px solid ${report.color}20`,
                transition: 'all 0.3s ease',
              }}
              bodyStyle={{ padding: '24px' }}
              onClick={() => navigate(report.path)}
            >
              <div 
                className="mb-4"
                style={{ 
                  fontSize: "3rem", 
                  color: report.color,
                  marginBottom: "1.5rem" 
                }}
              >
                {report.icon}
              </div>
              <Title level={4} className="mb-3" style={{ color: report.color }}>
                {report.title}
              </Title>
              <Text type="secondary" className="block mb-4">
                {report.description}
              </Text>
              <Button 
                type="primary" 
                style={{ backgroundColor: report.color, borderColor: report.color }}
                className="w-full"
                onClick={() => navigate(report.path)}
              >
                Generate Report
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} className="mt-8">
        <Col xs={24} sm={8}>
          <Card className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{reportTypes.length}</div>
            <Text type="secondary">Available Reports</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">PDF</div>
            <Text type="secondary">Export Format</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">Real-time</div>
            <Text type="secondary">Data Updates</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
