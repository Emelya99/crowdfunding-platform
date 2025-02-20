import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";

export default function HomePage() {
  return (
    <Container>
      <div className="space-y-4">
        <h1 className="text-primary text-2xl font-bold">Heading</h1>
        <p className="text-foreground">This is a regular text.</p>

        <Button>Default Button</Button>
        <Button variant="outline">Outlined</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="ghost">Transparent</Button>
        <Button variant="link">Link</Button>
      </div>
    </Container>
  );
}
