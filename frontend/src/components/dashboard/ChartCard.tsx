import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const ChartCard = ({ title, subtitle, children, className, action }: ChartCardProps) => (
  <Card className={cn('hover:shadow-md transition-shadow', className)}>
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default ChartCard;
