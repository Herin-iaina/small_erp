import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCategories } from "@/services/stock";
import type { ProductCategory } from "@/types/stock";

interface CategorySelectProps {
  companyId: number;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

export function CategorySelect({
  companyId,
  value,
  onChange,
  placeholder = "Categorie",
  allowEmpty = true,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    if (!companyId) return;
    listCategories({ company_id: companyId, page_size: 100, is_active: true })
      .then((res) => setCategories(res.items))
      .catch(() => setCategories([]));
  }, [companyId]);

  return (
    <Select
      value={value?.toString() ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? null : Number(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="all">Toutes</SelectItem>}
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id.toString()}>
            {cat.name} ({cat.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
