"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"

export interface FilterConfig {
  key: string
  label: string
  options: { value: string; label: string }[]
  defaultValue?: string
}

interface SearchFilterProps {
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onSearch: (query: string) => void
  onFilter: (filters: Record<string, string>) => void
  className?: string
}

export function SearchFilter({
  searchPlaceholder = "Search...",
  filters = [],
  onSearch,
  onFilter,
  className
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    filters.forEach(f => {
      if (f.defaultValue) initial[f.key] = f.defaultValue
    })
    return initial
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterValues, [key]: value }
    if (value === "all") {
      delete newFilters[key]
    }
    setFilterValues(newFilters)
    onFilter(newFilters)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    onSearch("")
  }

  const handleClearFilters = () => {
    setFilterValues({})
    onFilter({})
  }

  const hasActiveFilters = Object.keys(filterValues).length > 0

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters */}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filterValues[filter.key] || "all"}
            onValueChange={(value) => handleFilterChange(filter.key, value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
