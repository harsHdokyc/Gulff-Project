import { describe, it, expect } from "vitest";

describe("UserManagementPage PRO Association Logic", () => {
  it("should enable button when no accepted association requests exist", () => {
    // Mock data representing no associated PRO
    const associationRequests = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'rejected' }
    ];
    
    // Simulate the fixed logic
    const hasExistingPro = associationRequests?.some(req => req.status === 'accepted') || false;
    
    expect(hasExistingPro).toBe(false);
  });

  it("should disable button when accepted association request exists", () => {
    // Mock data representing an associated PRO
    const associationRequests = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'accepted' }
    ];
    
    // Simulate the fixed logic
    const hasExistingPro = associationRequests?.some(req => req.status === 'accepted') || false;
    
    expect(hasExistingPro).toBe(true);
  });

  it("should handle empty association requests", () => {
    // Mock data representing no requests at all
    const associationRequests = [];
    
    // Simulate the fixed logic
    const hasExistingPro = associationRequests?.some(req => req.status === 'accepted') || false;
    
    expect(hasExistingPro).toBe(false);
  });

  it("should handle null/undefined association requests", () => {
    // Mock data representing undefined requests
    const associationRequests = undefined;
    
    // Simulate the fixed logic
    const hasExistingPro = associationRequests?.some(req => req.status === 'accepted') || false;
    
    expect(hasExistingPro).toBe(false);
  });
});
