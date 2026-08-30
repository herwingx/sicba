import { useState } from 'react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuestionsAdmin() {
  const [showLatexDemo, setShowLatexDemo] = useState(true);

  // Ejemplo de ecuación para probar KaTeX
  const equation = 'Calcula el límite: $$ \\lim_{x \\to 0} \\frac{\\sin(x)}{x} $$';

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Reactivos (Sábado 2)</h1>
        <Button onClick={() => setShowLatexDemo(!showLatexDemo)}>
          Alternar Demo KaTeX
        </Button>
      </div>

      {showLatexDemo && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Demostración de renderizado LaTeX</CardTitle>
            <CardDescription>
              Este componente será usado para que los alumnos vean matemáticas perfectas.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xl text-center py-6">
            <Latex>{equation}</Latex>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado de Reactivos</CardTitle>
          <CardDescription>
            Aquí listaremos las preguntas consumidas desde nuestro backend de Express. (Para que funcione, primero debes ingresar tu PASSWORD de Supabase en los archivos .env).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4 text-center text-muted-foreground">
            El backend está configurado. Conecta tu DB para ver datos reales.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
