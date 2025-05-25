SELECT id, name, age
FROM users
WHERE age > 18
ORDER BY name;

SELECT id, name, memail, mphone, address, city, state, zip_code, country, created_at, updated_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC;

SELECT id
FROM users
WHERE name = 'John'
AND age > 25
OR status = 'active';

SELECT e.employee_id, e.first_name, e.last_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000
AND e.hire_date > '2020-01-01';

SELECT o.order_id, c.customer_name, SUM(oi.quantity * p.price) AS total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2023-01-01'
GROUP BY o.order_id, c.customer_name
HAVING SUM(oi.quantity * p.price) > 1000
ORDER BY total_amount DESC;

SELECT department_name, (
    SELECT COUNT(*) 
    FROM employees e
    WHERE e.department_id = d.department_id
) AS employee_count
FROM departments d
WHERE department_id IN (
    SELECT department_id
    FROM employees
    GROUP BY department_id
    HAVING COUNT(*) > 5
 );

-- 查询高价值客户
SELECT c.customer_id, c.name,
 /* 计算客户总消费金额 */
 SUM(o.amount) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= '2023-01-01' -- 只查询今年的订单
GROUP BY c.customer_id, c.name
HAVING SUM(o.amount) > 1000 -- 高价值客户标准
ORDER BY total_spent DESC;

SELECT p.product_id, p.product_name, p.price, c.category_name
FROM products p
JOIN categories c ON p.category_id = c.category_id
WHERE (p.price BETWEEN 10 AND 50 OR p.price > 100)
AND p.stock_quantity > 0
AND (c.category_name = 'Electronics' OR c.category_name = 'Books')
ORDER BY p.price asc;

SELECT e.employee_id, e.first_name, e.last_name, e.email, e.phone_number, e.hire_date, e.job_id, 
       e.salary, e.commission_pct, e.manager_id, e.department_id, d.department_name, j.job_title, 
       l.city, l.state_province, l.country_id, c.country_name, r.region_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN jobs j ON e.job_id = j.job_id
JOIN locations l ON d.location_id = l.location_id
JOIN countries c ON l.country_id = c.country_id
JOIN regions r ON c.region_id = r.region_id
WHERE e.salary > 5000;

INSERT INTO employees (employee_id, first_name, last_name, email, phone_number, hire_date, 
                       job_id, salary, commission_pct, manager_id, department_id)
VALUES (207, 'John', 'Doe', 'john.doe@example.com', '515.123.4567', '2023-05-21', 
        'IT_PROG', 6000, NULL, 103, 60 );

UPDATE employees
SET salary = salary * 1.1,
    commission_pct = commission_pct * 1.2
WHERE department_id = 80
AND commission_pct IS NOT NULL;

CREATE TABLE project_assignments (
    assignment_id NUMBER (6) PRIMARY key,
    employee_id NUMBER (6) NOT NULL REFERENCES employees (employee_id),
    project_id NUMBER (6) NOT NULL REFERENCES projects (project_id),
    start_date DATE NOT NULL,
    end_date DATE,
    role VARCHAR2 (50),
    hours_per_week NUMBER (4, 2),
    CONSTRAINT pk_proj_assign UNIQUE (employee_id, project_id, start_date)
 );

 SELECT employee_id, first_name, last_name, salary, 
        CASE WHEN  salary < 5000 THEN 'Low' 
             WHEN salary BETWEEN 5000 AND 10000 THEN 'Medium' 
             WHEN salary > 10000 THEN 'High' ELSE 'Unknown' END AS salary_category 
FROM employees ORDER BY salary DESC;