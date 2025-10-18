import AudienceMap from "@/components/AudienceMap";
import DockAnimation from "@/components/DockAnimation";
import InitPage from "./initPage";
import { FieldSwitch } from "@/components/fieldSwitch";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4 z-10 grid grid-cols-1 gap-2">
        <FieldSwitch title="Market Competitors" description="Who's copying your genius idea?" />
        <FieldSwitch title="Customer Demographics" description="Where's the market?" />
        <FieldSwitch title="VC Victims" description="Who is willing to throw you money?" />
        <FieldSwitch title="Co-founders" description="Who's willing to scale a B2B AI SaaS startup?" />
      </div>
      <AudienceMap />
    </div>
  );
}
