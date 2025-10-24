import React from 'react';

export interface DumpsterSize {
  cubic_yards: string;
  dimensions?: string;
  starting_price?: string;
  starting_tonnage?: string;
  per_ton_overage_price?: string;
}

export interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  website?: string;
  service_areas: string;
  dumpster_sizes: DumpsterSize[];
  rating: number;
  google_place_id?: string;
  google_rating?: number;
  google_user_ratings_total?: number;
}

interface CompanyListProps {
  companies: Company[];
  comparisonSize: string;
  selectedCompanyId?: string;
  preselectedCompanyId?: number | null;
  onCompanySelect: (companyId: number) => void;
  showPreselectionBadge?: boolean;
}

const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  comparisonSize,
  selectedCompanyId,
  preselectedCompanyId,
  onCompanySelect,
  showPreselectionBadge = false
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginBottom: '20px'
    }}>
      {companies.map(company => {
        const matchingSize = company.dumpster_sizes?.find(size => size.cubic_yards === comparisonSize);
        const isPreselected = showPreselectionBadge && preselectedCompanyId === company.id;

        return (
          <div
            key={company.id}
            id={`company-${company.id}`}
            style={{
              border: isPreselected ? '3px solid #28a745' : '2px solid #e9ecef',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: isPreselected ? '#f8fff8' : '#ffffff',
              boxShadow: isPreselected
                ? '0 4px 12px rgba(40, 167, 69, 0.2)'
                : '0 2px 4px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
            onClick={() => onCompanySelect(company.id)}
            onMouseEnter={(e) => {
              if (!isPreselected) {
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,123,255,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isPreselected) {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }
            }}
          >
            {/* Preselection Badge */}
            {isPreselected && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '10px',
                backgroundColor: '#28a745',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                ✓ Previously Selected
              </div>
            )}

            <div style={{ marginBottom: '8px' }}>
              <h4 style={{ margin: '0 0 3px 0', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>
                {company.name}
              </h4>
              <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>
                {company.address}
              </p>
              {company.google_rating && company.google_rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f4b400' }}>
                    ⭐ {company.google_rating.toFixed(1)}
                  </span>
                  <span style={{ color: '#666', fontSize: '10px' }}>
                    ({company.google_user_ratings_total} reviews)
                  </span>
                </div>
              )}
            </div>

            {matchingSize ? (
              <div>
                {matchingSize.starting_price ? (
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#28a745',
                    marginBottom: '6px'
                  }}>
                    {matchingSize.starting_price.startsWith('$') ? matchingSize.starting_price : `$${matchingSize.starting_price}`}
                  </div>
                ) : (
                  <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontStyle: 'italic', color: '#666', fontWeight: 'bold' }}>
                    Price not available. Provider may require quote.
                  </p>
                )}

                {matchingSize.starting_tonnage && (
                  <p style={{ margin: '0', fontSize: '10px', color: '#666' }}>
                    Includes {matchingSize.starting_tonnage} tons
                  </p>
                )}

                {matchingSize.per_ton_overage_price && (
                  <p style={{ margin: '0', fontSize: '10px', color: '#666' }}>
                    ${matchingSize.per_ton_overage_price}/ton overage
                  </p>
                )}
              </div>
            ) : (
              <p style={{ margin: '0', fontSize: '11px', fontStyle: 'italic', color: '#999' }}>
                {comparisonSize} yard size not available
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CompanyList;
